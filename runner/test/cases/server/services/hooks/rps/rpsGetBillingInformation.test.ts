import * as Code from "@hapi/code";
import * as Lab from "@hapi/lab";
import sinon from "sinon";
import { rpsGetBillingInformation } from "../../../../../../src/server/services/hooks/rps/rpsGetBillingInformation";

const { expect } = Code;
const lab = Lab.script();
exports.lab = lab;
const { describe, it, afterEach } = lab;

describe("rpsGetBillingInformation", () => {
  afterEach(() => {
    sinon.restore();
  });

  const buildRequest = (isStateFrozen: boolean) => {
    const cacheService = {
      isStateFrozen: sinon.stub().resolves(isStateFrozen),
    };

    const request: any = {
      service: {
        getServices: sinon.stub().returns({ cacheService }),
      },
    };

    return { request, cacheService };
  };

  it("returns billing information mapped from the state", async () => {
    const { request } = buildRequest(false);
    const context: any = {
      state: {
        firstName: "John",
        lastName: "Smith",
        emailAddress: "john.smith@email.com",
      },
    };

    const result = await rpsGetBillingInformation(request, context);

    expect(result).to.equal({
      billingFirstName: "John",
      billingLastName: "Smith",
      billingEmailAddress: "john.smith@email.com",
    });
  });

  it("returns undefined for the billing email address when it is absent from the state", async () => {
    const { request } = buildRequest(false);
    const context: any = {
      state: {
        firstName: "John",
        lastName: "Smith",
      },
    };

    const result = await rpsGetBillingInformation(request, context);

    expect(result.billingEmailAddress).to.be.undefined();
  });

  it("throws a ControllerError with a 500 status code when the state is frozen", async () => {
    const { request, cacheService } = buildRequest(true);
    const context: any = {
      state: {
        firstName: "John",
        lastName: "Smith",
        emailAddress: "john.smith@email.com",
      },
    };

    try {
      await rpsGetBillingInformation(request, context);
      expect(true).to.equal(false);
    } catch (err: any) {
      expect(err.name).to.equal("ControllerError");
      expect(err.output.statusCode).to.equal(500);
    }

    expect(cacheService.isStateFrozen.called).to.be.true();
  });
});
