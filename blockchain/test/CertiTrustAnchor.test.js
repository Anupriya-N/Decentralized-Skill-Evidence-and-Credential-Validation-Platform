const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CertiTrustAnchor Smart Contract", function () {
  let anchor;
  let owner;
  let issuer;
  let relayer;
  let unauthorized;
  let contractAddress;
  let chainId;

  const sampleHash = ethers.keccak256(ethers.toUtf8Bytes("OXF-2026-CS-001:alex:test-cred-hash"));
  const duplicateHash = sampleHash;
  const anotherHash = ethers.keccak256(ethers.toUtf8Bytes("OXF-2026-CS-002:maria:another-cred"));

  beforeEach(async function () {
    [owner, issuer, relayer, unauthorized] = await ethers.getSigners();
    const CertiTrustAnchor = await ethers.getContractFactory("CertiTrustAnchor");
    anchor = await CertiTrustAnchor.deploy();
    await anchor.waitForDeployment();
    contractAddress = await anchor.getAddress();
    const net = await ethers.provider.getNetwork();
    chainId = net.chainId;
  });

  it("Should set the deployer as owner and initial authorized issuer", async function () {
    expect(await anchor.owner()).to.equal(owner.address);
    expect(await anchor.authorizedIssuers(owner.address)).to.be.true;
  });

  it("Owner can authorize and deauthorize issuers", async function () {
    await expect(anchor.authorizeIssuer(issuer.address))
      .to.emit(anchor, "IssuerAuthorized")
      .withArgs(issuer.address);

    expect(await anchor.authorizedIssuers(issuer.address)).to.be.true;

    await expect(anchor.deauthorizeIssuer(issuer.address))
      .to.emit(anchor, "IssuerDeauthorized")
      .withArgs(issuer.address);

    expect(await anchor.authorizedIssuers(issuer.address)).to.be.false;
  });

  it("Authorized issuer can register a credential directly", async function () {
    await anchor.authorizeIssuer(issuer.address);

    await expect(anchor.connect(issuer).registerCredential(sampleHash))
      .to.emit(anchor, "CredentialRegistered");

    const [exists, recordedIssuer, issuedAt, revoked] = await anchor.verifyCredential(sampleHash);
    expect(exists).to.be.true;
    expect(recordedIssuer).to.equal(issuer.address);
    expect(revoked).to.be.false;
    expect(issuedAt).to.be.gt(0);
  });

  it("Should prevent duplicate credential hash registration", async function () {
    await anchor.authorizeIssuer(issuer.address);
    await anchor.connect(issuer).registerCredential(sampleHash);

    await expect(
      anchor.connect(issuer).registerCredential(duplicateHash)
    ).to.be.revertedWith("CertiTrust: credential hash already registered");
  });

  it("Should prevent unauthorized callers from registering credentials directly", async function () {
    await expect(
      anchor.connect(unauthorized).registerCredential(anotherHash)
    ).to.be.revertedWith("CertiTrust: caller is not an authorized issuer");
  });

  it("Issuer or owner can revoke a credential directly", async function () {
    await anchor.authorizeIssuer(issuer.address);
    await anchor.connect(issuer).registerCredential(sampleHash);

    await expect(anchor.connect(issuer).revokeCredential(sampleHash))
      .to.emit(anchor, "CredentialRevoked");

    const [exists, , , revoked] = await anchor.verifyCredential(sampleHash);
    expect(exists).to.be.true;
    expect(revoked).to.be.true;
  });

  it("Should prevent non-issuer/non-owner from revoking directly", async function () {
    await anchor.authorizeIssuer(issuer.address);
    await anchor.connect(issuer).registerCredential(sampleHash);

    await expect(
      anchor.connect(unauthorized).revokeCredential(sampleHash)
    ).to.be.revertedWith("CertiTrust: caller is not the issuer or contract owner");
  });

  // EIP-712 Relayed Transactions
  it("Relayer can register credential on behalf of authorized institution using EIP-712 signature", async function () {
    await anchor.authorizeIssuer(issuer.address);

    const nonce = await anchor.nonces(issuer.address);
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    const domain = {
      name: "CertiTrustAnchor",
      version: "1",
      chainId: chainId,
      verifyingContract: contractAddress,
    };

    const types = {
      IssueAuthorization: [
        { name: "credentialHash", type: "bytes32" },
        { name: "issuer", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    const value = {
      credentialHash: sampleHash,
      issuer: issuer.address,
      nonce: Number(nonce),
      deadline: deadline,
    };

    const signature = await issuer.signTypedData(domain, types, value);

    // Relayer submits transaction
    await expect(
      anchor.connect(relayer).registerCredentialWithSignature(
        sampleHash,
        issuer.address,
        nonce,
        deadline,
        signature
      )
    ).to.emit(anchor, "CredentialRegistered");

    // On-chain recorded issuer must strictly be the institution, NOT the relayer!
    const [exists, recordedIssuer, , revoked] = await anchor.verifyCredential(sampleHash);
    expect(exists).to.be.true;
    expect(recordedIssuer).to.equal(issuer.address);
    expect(revoked).to.be.false;
    expect(await anchor.nonces(issuer.address)).to.equal(nonce + 1n);
  });

  it("Should reject relayed registration if nonce is replayed (Replay Attack Prevention)", async function () {
    await anchor.authorizeIssuer(issuer.address);
    const nonce = await anchor.nonces(issuer.address);
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    const domain = {
      name: "CertiTrustAnchor",
      version: "1",
      chainId: chainId,
      verifyingContract: contractAddress,
    };

    const types = {
      IssueAuthorization: [
        { name: "credentialHash", type: "bytes32" },
        { name: "issuer", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    const signature = await issuer.signTypedData(domain, types, {
      credentialHash: sampleHash,
      issuer: issuer.address,
      nonce: Number(nonce),
      deadline: deadline,
    });

    // First submission succeeds
    await anchor.connect(relayer).registerCredentialWithSignature(
      sampleHash,
      issuer.address,
      nonce,
      deadline,
      signature
    );

    // Replay attempt must revert
    await expect(
      anchor.connect(relayer).registerCredentialWithSignature(
        sampleHash,
        issuer.address,
        nonce,
        deadline,
        signature
      )
    ).to.be.revertedWith("CertiTrust: invalid or consumed nonce");
  });

  it("Relayer can revoke credential using EIP-712 institutional revocation signature", async function () {
    await anchor.authorizeIssuer(issuer.address);
    await anchor.connect(issuer).registerCredential(sampleHash);

    const nonce = await anchor.nonces(issuer.address);
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    const domain = {
      name: "CertiTrustAnchor",
      version: "1",
      chainId: chainId,
      verifyingContract: contractAddress,
    };

    const types = {
      RevokeAuthorization: [
        { name: "credentialHash", type: "bytes32" },
        { name: "issuer", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    const value = {
      credentialHash: sampleHash,
      issuer: issuer.address,
      nonce: Number(nonce),
      deadline: deadline,
    };

    const signature = await issuer.signTypedData(domain, types, value);

    await expect(
      anchor.connect(relayer).revokeCredentialWithSignature(
        sampleHash,
        issuer.address,
        nonce,
        deadline,
        signature
      )
    ).to.emit(anchor, "CredentialRevoked");

    const [exists, recordedIssuer, , revoked] = await anchor.verifyCredential(sampleHash);
    expect(exists).to.be.true;
    expect(recordedIssuer).to.equal(issuer.address);
    expect(revoked).to.be.true;
  });

  // Zero Hash Prevention
  it("Should revert if credentialHash is zero bytes32(0)", async function () {
    await anchor.authorizeIssuer(issuer.address);
    const zeroHash = ethers.ZeroHash;

    await expect(
      anchor.connect(issuer).registerCredential(zeroHash)
    ).to.be.revertedWith("CertiTrust: invalid credential hash");
  });

  // Expired Deadline Protection
  it("Should reject relayed registration if deadline has expired", async function () {
    await anchor.authorizeIssuer(issuer.address);
    const nonce = await anchor.nonces(issuer.address);
    const expiredDeadline = Math.floor(Date.now() / 1000) - 3600; // 1 hour in the past

    const domain = {
      name: "CertiTrustAnchor",
      version: "1",
      chainId: chainId,
      verifyingContract: contractAddress,
    };

    const types = {
      IssueAuthorization: [
        { name: "credentialHash", type: "bytes32" },
        { name: "issuer", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    const signature = await issuer.signTypedData(domain, types, {
      credentialHash: sampleHash,
      issuer: issuer.address,
      nonce: Number(nonce),
      deadline: expiredDeadline,
    });

    await expect(
      anchor.connect(relayer).registerCredentialWithSignature(
        sampleHash,
        issuer.address,
        nonce,
        expiredDeadline,
        signature
      )
    ).to.be.revertedWith("CertiTrust: authorization signature expired");
  });

  // Invalid / Corrupted Signature Protection
  it("Should reject relayed registration if signature is corrupted or invalid", async function () {
    await anchor.authorizeIssuer(issuer.address);
    const nonce = await anchor.nonces(issuer.address);
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    // Unauthorized party signs instead of the declared issuer
    const domain = {
      name: "CertiTrustAnchor",
      version: "1",
      chainId: chainId,
      verifyingContract: contractAddress,
    };

    const types = {
      IssueAuthorization: [
        { name: "credentialHash", type: "bytes32" },
        { name: "issuer", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    const forgedSignature = await unauthorized.signTypedData(domain, types, {
      credentialHash: sampleHash,
      issuer: issuer.address,
      nonce: Number(nonce),
      deadline: deadline,
    });

    await expect(
      anchor.connect(relayer).registerCredentialWithSignature(
        sampleHash,
        issuer.address,
        nonce,
        deadline,
        forgedSignature
      )
    ).to.be.revertedWith("CertiTrust: invalid EIP-712 institutional signature");
  });

  // Low-s Malleability Protection Test
  it("Should reject malleable high-s signature", async function () {
    await anchor.authorizeIssuer(issuer.address);
    const nonce = await anchor.nonces(issuer.address);
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    const domain = {
      name: "CertiTrustAnchor",
      version: "1",
      chainId: chainId,
      verifyingContract: contractAddress,
    };

    const types = {
      IssueAuthorization: [
        { name: "credentialHash", type: "bytes32" },
        { name: "issuer", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    const signature = await issuer.signTypedData(domain, types, {
      credentialHash: sampleHash,
      issuer: issuer.address,
      nonce: Number(nonce),
      deadline: deadline,
    });

    const sig = ethers.Signature.from(signature);
    const N = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");
    const highS = (N - BigInt(sig.s)).toString(16).padStart(64, "0");
    const flippedV = sig.v === 27 ? 28 : 27;
    const malleableSig = ethers.concat([sig.r, "0x" + highS, ethers.toBeHex(flippedV, 1)]);

    await expect(
      anchor.connect(relayer).registerCredentialWithSignature(
        sampleHash,
        issuer.address,
        nonce,
        deadline,
        malleableSig
      )
    ).to.be.revertedWith("CertiTrust: invalid signature 's' value (malleability risk)");
  });

  // Issuer Mismatch on Revocation
  it("Relayed revocation should revert if signer is not the original credential issuer", async function () {
    await anchor.authorizeIssuer(issuer.address);
    await anchor.connect(issuer).registerCredential(sampleHash);

    const otherIssuer = unauthorized;
    await anchor.authorizeIssuer(otherIssuer.address);

    const nonce = await anchor.nonces(otherIssuer.address);
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    const domain = {
      name: "CertiTrustAnchor",
      version: "1",
      chainId: chainId,
      verifyingContract: contractAddress,
    };

    const types = {
      RevokeAuthorization: [
        { name: "credentialHash", type: "bytes32" },
        { name: "issuer", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    const signature = await otherIssuer.signTypedData(domain, types, {
      credentialHash: sampleHash,
      issuer: otherIssuer.address,
      nonce: Number(nonce),
      deadline: deadline,
    });

    await expect(
      anchor.connect(relayer).revokeCredentialWithSignature(
        sampleHash,
        otherIssuer.address,
        nonce,
        deadline,
        signature
      )
    ).to.be.revertedWith("CertiTrust: signer is not the original credential issuer");
  });

  // Deauthorized Issuer Rejection
  it("Should reject relayed registration if issuer has been deauthorized", async function () {
    await anchor.authorizeIssuer(issuer.address);
    await anchor.deauthorizeIssuer(issuer.address);

    const nonce = await anchor.nonces(issuer.address);
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    const domain = {
      name: "CertiTrustAnchor",
      version: "1",
      chainId: chainId,
      verifyingContract: contractAddress,
    };

    const types = {
      IssueAuthorization: [
        { name: "credentialHash", type: "bytes32" },
        { name: "issuer", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    const signature = await issuer.signTypedData(domain, types, {
      credentialHash: sampleHash,
      issuer: issuer.address,
      nonce: Number(nonce),
      deadline: deadline,
    });

    await expect(
      anchor.connect(relayer).registerCredentialWithSignature(
        sampleHash,
        issuer.address,
        nonce,
        deadline,
        signature
      )
    ).to.be.revertedWith("CertiTrust: signer is not an authorized issuer");
  });

  // Ownership Transfer Tests
  describe("Ownership Transfer Lifecycle", function () {
    it("Owner can transfer ownership to a new address", async function () {
      await expect(anchor.connect(owner).transferOwnership(issuer.address))
        .to.emit(anchor, "OwnershipTransferred")
        .withArgs(owner.address, issuer.address);

      expect(await anchor.owner()).to.equal(issuer.address);
    });

    it("Non-owner cannot transfer ownership", async function () {
      await expect(
        anchor.connect(unauthorized).transferOwnership(unauthorized.address)
      ).to.be.revertedWith("CertiTrust: caller is not the owner");
    });

    it("Cannot transfer ownership to zero address", async function () {
      await expect(
        anchor.connect(owner).transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWith("CertiTrust: new owner is zero address");
    });
  });
});
