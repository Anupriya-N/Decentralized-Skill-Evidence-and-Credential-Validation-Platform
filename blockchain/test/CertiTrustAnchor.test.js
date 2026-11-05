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
});
