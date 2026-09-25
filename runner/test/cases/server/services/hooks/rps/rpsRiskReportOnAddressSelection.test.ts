import * as Code from "@hapi/code";
import * as Lab from "@hapi/lab";
import sinon from "sinon";
import { Address } from "../../../../../../src/server/services/addressLookupService";
import { rpsRiskReportOnAddressSelection } from "../../../../../../src/server/services/hooks/rps/rpsRiskReportOnAddressSelection";

const { expect } = Code;
const lab = Lab.script();
exports.lab = lab;
const { describe, it, afterEach } = lab;

const buildRequest = ({
  isStateFrozen = false,
  lookupResponse = { success: true, data: { found: true } },
}: {
  isStateFrozen?: boolean;
  lookupResponse?: any;
} = {}) => {
  const cacheService = {
    isStateFrozen: sinon.stub().resolves(isStateFrozen),
    getState: sinon.stub().resolves({
      progress: ["/select-an-address"],
    }),
  };

  const riskReportApiService = {
    lookupAddress: sinon.stub().resolves(lookupResponse),
  };

  const request: any = {
    service: {
      getServices: sinon.stub().returns({
        cacheService,
        riskReportApiService,
      }),
    },
    yar: {
      get: sinon.stub().returns("session-id"),
      set: sinon.stub(),
    },
    logger: {
      trace: sinon.stub(),
    },
  };

  return { request, cacheService, riskReportApiService };
};

const expectControllerError = async (
  action: Promise<void>,
  message: string,
  statusCode: number
) => {
  try {
    await action;
    throw new Error("Expected the hook to throw");
  } catch (error: any) {
    expect(error.name).to.equal("ControllerError");
    expect(error.message).to.contain(message);
    expect(error.output.statusCode).to.equal(statusCode);
    return error;
  }
};

describe("rpsRiskReportOnAddressSelection", () => {
  afterEach(() => {
    sinon.restore();
  });

  const address: Address = {
    address: "10 Downing Street, London",
    postcode: "SW1A 2AA",
    udprn: "12345",
    uprn: "987654321",
    countryCode: "E",
  };

  it("checks the selected address with the RPS service", async () => {
    const { request, riskReportApiService } = buildRequest();

    await rpsRiskReportOnAddressSelection(request, {
      state: { address },
      model: {} as any,
    });

    expect(riskReportApiService.lookupAddress.firstCall.args[0]).to.equal({
      uuid: "session-id",
      udprn: "00012345",
      countryCode: "E",
      fullAddress: address.address,
    });
  });

  it("throws when no selected address is supplied", async () => {
    const { request, riskReportApiService } = buildRequest();

    await expectControllerError(
      rpsRiskReportOnAddressSelection(request, {
        state: {},
        model: {} as any,
      }),
      "cannot find selected address",
      500
    );

    expect(riskReportApiService.lookupAddress.called).to.be.false();
  });

  it("throws when the session state is frozen", async () => {
    const { request, cacheService, riskReportApiService } = buildRequest({
      isStateFrozen: true,
    });

    await expectControllerError(
      rpsRiskReportOnAddressSelection(request, {
        state: { address },
        model: {} as any,
      }),
      "state is frozen",
      500
    );

    expect(cacheService.isStateFrozen.calledOnce).to.be.true();
    expect(riskReportApiService.lookupAddress.called).to.be.false();
  });

  it("throws a 404 when the address is not in the RPS database", async () => {
    const { request } = buildRequest({
      lookupResponse: { success: true, data: { found: false } },
    });

    const error = await expectControllerError(
      rpsRiskReportOnAddressSelection(request, {
        state: { address },
        model: {} as any,
      }),
      "address is not in database",
      404
    );

    expect(error.data.data).to.equal({
      findAnAddressUrl: "./find-a-report-address",
    });
  });

  it("throws a 500 when the RPS database check fails", async () => {
    const { request } = buildRequest({
      lookupResponse: { success: false },
    });

    const error = await expectControllerError(
      rpsRiskReportOnAddressSelection(request, {
        state: { address },
        model: {} as any,
      }),
      "database check not successful",
      500
    );

    expect(error.data.page).to.equal("500-database-check-error");
  });

  it("wraps unexpected RPS service errors in a ControllerError", async () => {
    const { request, riskReportApiService } = buildRequest();
    riskReportApiService.lookupAddress.rejects(
      new Error("service unavailable")
    );

    const error = await expectControllerError(
      rpsRiskReportOnAddressSelection(request, {
        state: { address },
        model: {} as any,
      }),
      "service unavailable",
      500
    );

    expect(error.stack).to.contain("service unavailable");
  });
});
