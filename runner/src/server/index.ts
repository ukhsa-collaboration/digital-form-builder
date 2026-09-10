import hapi, { ServerOptions } from "@hapi/hapi";
import fs from "fs";

import inert from "@hapi/inert";
import Scooter from "@hapi/scooter";
import blipp from "blipp";
import Schmervice from "schmervice";
import config from "./config";

import { configureInitialiseSessionPlugin } from "server/plugins/initialiseSession/configurePlugin";
import { configureBlankiePlugin } from "./plugins/blankie";
import { configureCrumbPlugin } from "./plugins/crumb";
import { configureEnginePlugin } from "./plugins/engine";
import { configureRateLimitPlugin } from "./plugins/rateLimit";
import { configureBlankiePlugin } from "./plugins/blankie";
import { configureCrumbPlugin } from "./plugins/crumb";
import { configureInitialiseSessionPlugin } from "server/plugins/initialiseSession/configurePlugin";

import pluginLocale from "./plugins/locale";
import pluginServiceHelper from "./plugins/serviceHelper";
import pluginHooks from "server/services/hooks";
import pluginSession from "./plugins/session";
import pluginAuth from "./plugins/auth";
import pluginViews from "./plugins/views";
import pluginApplicationStatus from "./plugins/applicationStatus";
import pluginAuth from "./plugins/auth";
import pluginErrorPages from "./plugins/errorPages";
import pluginLocale from "./plugins/locale";
import pluginLogging from "./plugins/logging";
import pluginPulse from "./plugins/pulse";
import pluginRouter from "./plugins/router";
import pluginServiceHelper from "./plugins/serviceHelper";
import pluginSession from "./plugins/session";
import pluginViews from "./plugins/views";
import {
  AddressService,
  CacheService,
  catboxProvider,
  ExitService,
  FormSecurityService,
  getSecureFormSubmissionServiceInstance,
  MagicLinkCacheService,
  MockUploadService,
  NotifyService,
  PayService,
  SecureFormSubmissionService,
  StatusService,
  UploadService,
  WebhookService,
} from "./services";
import { DynamicServices } from "./services/dynamicServices";
import { HapiRequest, HapiResponseToolkit, RouteConfig } from "./types";
import getRequestInfo from "./utils/getRequestInfo";
import { isValidSecureFormSubmissionConfig } from "./utils/isValidSecureFormSubmissionConfig";

const serverOptions = (): ServerOptions => {
  const hasCertificate = config.sslKey && config.sslCert;

  const serverOptions: ServerOptions = {
    debug: { request: [`${config.isDev}`] },
    port: config.port,
    router: {
      stripTrailingSlash: true,
    },
    routes: {
      validate: {
        options: {
          abortEarly: false,
        },
      },
      security: {
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: false,
        },
        xss: "enabled",
        noSniff: true,
        xframe: true,
      },
    },
    cache: [{ provider: catboxProvider() }],
  };

  const httpsOptions = hasCertificate
    ? {
        tls: {
          key: fs.readFileSync(config.sslKey),
          cert: fs.readFileSync(config.sslCert),
        },
      }
    : {};

  return {
    ...serverOptions,
    ...httpsOptions,
  };
};

async function createServer(routeConfig: RouteConfig) {
  const server = hapi.server(serverOptions());
  const { formFileName, formFilePath, options } = routeConfig;

  if (config.enableMockApi) {
    const { mockServer } = await import("./mocks/server");
    mockServer.listen({ onUnhandledRequest: "bypass" });
    server.events.on("stop", () => mockServer.close());
  }

  if (config.rateLimit) {
    await server.register(configureRateLimitPlugin(routeConfig));
  }
  await server.register(pluginLogging);
  await server.register(pluginSession);
  await server.register(pluginPulse);
  await server.register(inert);
  await server.register(Scooter);
  await server.register(
    configureInitialiseSessionPlugin({
      safelist: config.safelist,
    })
  );
  await server.register(configureBlankiePlugin(config));
  await server.register(configureCrumbPlugin(config, routeConfig));
  await server.register(Schmervice);
  await server.register(pluginServiceHelper);
  await server.register(pluginHooks);
  await server.register(pluginAuth);

  server.registerService([
    CacheService,
    MagicLinkCacheService,
    NotifyService,
    PayService,
    WebhookService,
    AddressService,
    ExitService,
    FormSecurityService,
  ]);

  if (!config.documentUploadApiUrl) {
    server.registerService([
      Schmervice.withName("uploadService", MockUploadService),
    ]);
  } else {
    server.registerService([UploadService]);
  }

  if (config.enableQueueService) {
    const queueType = config.queueType;
    const queueService =
      queueType === "PGBOSS" ? PgBossQueueService : MySqlQueueService;
    server.registerService([
      Schmervice.withName("queueService", queueService),
      Schmervice.withName("statusService", QueueStatusService),
    ]);
  } else {
    server.registerService(StatusService);
  }

  server.ext(
    "onPreResponse",
    (request: HapiRequest, h: HapiResponseToolkit) => {
      const { response } = request;

      if ("isBoom" in response && response.isBoom) {
        return h.continue;
      }

      if ("header" in response && response.header) {
        response.header("X-Robots-Tag", "noindex, nofollow");

        const WEBFONT_EXTENSIONS = /\.(?:eot|ttf|woff|svg|woff2)$/i;
        if (!WEBFONT_EXTENSIONS.test(request.url.toString())) {
          response.header(
            "cache-control",
            "private, no-cache, no-store, must-revalidate, max-age=0"
          );
          response.header("pragma", "no-cache");
          response.header("expires", "0");
        } else {
          response.header("cache-control", "public, max-age=604800, immutable");
        }
      }
      return h.continue;
    }
  );

  server.ext("onRequest", (request: HapiRequest, h: HapiResponseToolkit) => {
    const { pathname } = getRequestInfo(request);

    request.app.location = pathname;

    return h.continue;
  });

  const enginePlugin = configureEnginePlugin(
    formFileName,
    formFilePath,
    options
  );

  for (const form of enginePlugin.options.configs) {
    const formId = form.id;

    if (
      isValidSecureFormSubmissionConfig(
        form.configuration.secureFormSubmissionConfig
      )
    ) {
      const instanceName = getSecureFormSubmissionServiceInstance(formId);
      const namedService = new SecureFormSubmissionService(
        form.configuration.secureFormSubmissionConfig
      );
      await server.registerService(
        Schmervice.withName(instanceName, namedService)
      );
    }
  }

  const forms = configureEnginePlugin(formFileName, formFilePath, options);

  await server.register(pluginLocale);
  await server.register(pluginViews);
  await server.register(forms);
  await server.register(pluginApplicationStatus);
  await server.register(pluginRouter);
  await server.register(pluginErrorPages);
  await server.register(blipp);

  server.state("cookies_policy", {
    encoding: "base64json",
  });

  await server.register(pluginQueue);

  const dynamicServices = new DynamicServices();
  const dynamicServiceNames = new Set<string>();

  for (const form of forms.options.configs) {
    await dynamicServices.registerServices(
      server,
      form.id,
      form.configuration.services,
      dynamicServiceNames
    );
  }

  return server;
}

export default createServer;
