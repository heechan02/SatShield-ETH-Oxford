import { Effect, pipe } from "effect";
import { OracleService, type OracleFeedData } from "../services/OracleService";
import type { OracleError } from "../errors";

export interface OracleReadResult extends OracleFeedData {
  basisRisk: "low" | "medium" | "high";
  attestableSourceCount: number;
}

function assessBasisRisk(data: OracleFeedData): OracleReadResult {
  const attestable = data.fdcRequests.length;
  const basisRisk: "low" | "medium" | "high" =
    attestable >= 3 ? "low" : attestable >= 2 ? "medium" : "high";
  return { ...data, basisRisk, attestableSourceCount: attestable };
}

export const execute = (
  poolType: string,
  lat: number,
  lng: number
): Effect.Effect<OracleReadResult, OracleError, OracleService> =>
  pipe(
    OracleService,
    Effect.flatMap((svc) => svc.fetchReading(poolType, lat, lng)),
    Effect.map(assessBasisRisk)
  );

export const OracleReadPipeline = { execute };
