import { Output, Services } from "~templates-utils";
import { Input } from "./meta";

export function generate(input: Input): Output {
  const services: Services = [];

  const commonVolumes = [
    { type: "bind", name: input.UPLOAD_LOCATION, mountPath: "/usr/src/app/upload" },
  ];

  const commonEnv = [
    `DB_PASSWORD=${input.DB_PASSWORD}`,
    `DB_USERNAME=${input.DB_USERNAME}`,
    `DB_DATABASE_NAME=${input.DB_DATABASE_NAME}`,
    `IMMICH_SERVER_URL=${input.IMMICH_SERVER_URL}`,
    `IMMICH_WEB_URL=${input.IMMICH_WEB_URL}`,
    `TYPESENSE_API_KEY=${input.TYPESENSE_API_KEY}`,
  ];

  // immich-server
  services.push({
    type: "app",
    data: {
      projectName: input.projectName,
      serviceName: "immich-server",
      source: { type: "image", image: "ghcr.io/immich-app/immich-server:release" },
      entrypoint: ["/bin/sh", "./start-server.sh"],
      env: commonEnv.join("\n"),
      depends_on: ["redis", "database", "typesense"],
      restart: "always",
      mounts: commonVolumes,
    },
  });

  // immich-microservices
  services.push({
    type: "app",
    data: {
      projectName: input.projectName,
      serviceName: "immich-microservices",
      source: { type: "image", image: "ghcr.io/immich-app/immich-server:release" },
      entrypoint: ["/bin/sh", "./start-microservices.sh"],
      env: commonEnv.join("\n"),
      depends_on: ["redis", "database", "typesense"],
      restart: "always",
      mounts: commonVolumes,
    },
  });

  // immich-machine-learning
  services.push({
    type: "app",
    data: {
      projectName: input.projectName,
      serviceName: "immich-machine-learning",
      source: { type: "image", image: "ghcr.io/immich-app/immich-machine-learning:release" },
      env: commonEnv.join("\n"),
      restart: "always",
      mounts: [
        ...commonVolumes,
        { type: "volume", name: "model-cache", mountPath: "/cache" },
      ],
    },
  });

  // immich-web
  services.push({
    type: "app",
    data: {
      projectName: input.projectName,
      serviceName: "immich-web",
      source: { type: "image", image: "ghcr.io/immich-app/immich-web:release" },
      entrypoint: ["/bin/sh", "./entrypoint.sh"],
      env: commonEnv.join("\n"),
      restart: "always",
    },
  });

  // typesense
  services.push({
    type: "app",
    data: {
      projectName: input.projectName,
      serviceName: "immich-typesense",
      source: { type: "image", image: "typesense/typesense:0.24.0" },
      env: [
        `TYPESENSE_API_KEY=${input.TYPESENSE_API_KEY}`,
        "TYPESENSE_DATA_DIR=/data",
      ].join("\n"),
      restart: "always",
      mounts: [{ type: "volume", name: "tsdata", mountPath: "/data" }],
    },
  });

 // redis
  services.push({
    type: "app",
    data: {
      projectName: input.projectName,
      serviceName: "immich-redis",
      source: { type: "image", image: "redis:6.2" },
      restart: "always",
    },
  });

  // database
  services.push({
    type: "app",
    data: {
      projectName: input.projectName,
      serviceName: "immich-postgres",
      source: { type: "image", image: "postgres:14" },
      env: [
        `POSTGRES_PASSWORD=${input.DB_PASSWORD}`,
        `POSTGRES_USER=${input.DB_USERNAME}`,
        `POSTGRES_DB=${input.DB_DATABASE_NAME}`,
        "PG_DATA=/var/lib/postgresql/data",
      ].join("\n"),
      restart: "always",
      mounts: [{ type: "volume", name: "pgdata", mountPath: "/var/lib/postgresql/data" }],
    },
  });

  // immich-proxy
  services.push({
    type: "app",
    data: {
      projectName: input.projectName,
      serviceName: "immich-proxy",
      source: { type: "image", image: "ghcr.io/immich-app/immich-proxy:release" },
      env: [
        `IMMICH_SERVER_URL=${input.IMMICH_SERVER_URL}`,
        `IMMICH_WEB_URL=${input.IMMICH_WEB_URL}`,
      ].join("\n"),
      ports: [{ containerPort: 8080, hostPort: 2283 }],
      restart: "always",
      depends_on: ["immich-server"],
    },
  });

  return { services };
}