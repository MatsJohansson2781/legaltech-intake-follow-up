import assert from "node:assert/strict";
import { deadlineStatus, intakeSchema } from "./legaltech_intake.ts";

const input = { matterId: "matter-104", clientName: "Aster Media", signedDocumentUrl: "https://files.example.test/signed/104", deadline: "2026-01-05" };
assert.equal(intakeSchema.parse(input).matterId, "matter-104");
assert.equal(deadlineStatus(input.deadline), "follow-up");
assert.equal(deadlineStatus("2026-03-01"), "on-track");
console.log("legaltech intake decision test passed");
