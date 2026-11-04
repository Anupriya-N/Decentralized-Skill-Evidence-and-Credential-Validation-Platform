const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CertiTrustAnchor Smart Contract", function () {
  let anchor;
  let owner;
  let issuer;
  let student;
  let unauthorized;

  const sampleHash = ethers.keccak256(ethers.toUtf8Bytes("OXF-2026-CS-001:alex:test-cred-hash"));
  const duplicateHash = sampleHash;
  const anotherHash = ethers.keccak256(ethers.toUtf8Bytes("OXF-2026-CS-002:maria:another-cred"));

  beforeEach(async function () {
    [owner, issuer, student, unauthorized] = await ethers.getSigners();
    const CertiTrustAnchor = await ethers.getContractFactory("CertiTrustAnchor");
    anchor = await CertiTrustAnchor.deploy();
    await anchor.waitForDeployment();
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

  it("Authorized issuer can register a credential", async function () {
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

  it("Should prevent unauthorized callers from registering credentials", async function () {
    await expect(
      anchor.connect(unauthorized).registerCredential(anotherHash)
    ).to.be.revertedWith("CertiTrust: caller is not an authorized issuer");
  });

  it("Issuer or owner can revoke a credential", async function () {
    await anchor.authorizeIssuer(issuer.address);
    await anchor.connect(issuer).registerCredential(sampleHash);

    await expect(anchor.connect(issuer).revokeCredential(sampleHash))
      .to.emit(anchor, "CredentialRevoked");

    const [exists, , , revoked] = await anchor.verifyCredential(sampleHash);
    expect(exists).to.be.true;
    expect(revoked).to.be.true;
  });

  it("Should prevent non-issuer/non-owner from revoking", async function () {
    await anchor.authorizeIssuer(issuer.address);
    await anchor.connect(issuer).registerCredential(sampleHash);

    await expect(
      anchor.connect(unauthorized).revokeCredential(sampleHash)
    ).to.be.revertedWith("CertiTrust: caller is not the issuer or contract owner");
  });
});
