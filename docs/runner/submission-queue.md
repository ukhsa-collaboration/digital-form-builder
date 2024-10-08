# Submission queue

The runner can be configured to add new submissions to a queue and, if using the MYSQL queue type, for this queue to be
processed by the submitter module.

Two queue types are currently allowed, MYSQL and PGBOSS.

For `MYSQL`, enabling the queue service this will change the webhook process, so that the runner will push the
submission to a
specified database, and will await a response from the submitter for a few seconds before returning the success screen
to the user.

For `PGBOSS`, which handles events and queues as expected from event based architecture. The `PGBOSS` queue type
uses [pg-boss](https://www.npmjs.com/package/pg-boss).
You must have a postgres >v11 database configured. The runner will add job to the queue. It will then
poll `pgBoss.getJobById` for the reference number you wish to return to the user. You must implement this yourself.

In future, we may add support for different types of queues, like SQS.

## Setup

### Prerequisites

Decide if event or message based architecture is the right approach for your service, and if you have the digital
capability to support it in your organisation.
You may need queuing if your service expects high volume of submissions, but your webhook endpoints or further
downstream endpoints change frequently or have slow response times.

You will need to set up a MySQL or PostgreSQL database.

Use `PGBOSS` and PostgreSQL for higher availability and features like exponential backoff.
It is highly recommended you use `PGBOSS` and PostgreSQL. MYSQL may be deprecated due to the additional overhead and
support that is required.

#### PGBOSS Prerequisites

- PostgreSQL database >=v13
- A worker process which can connect to the PostgreSQL database, via PgBoss. Your implementation should look something like this

```ts
export async function setupWorker() {
  const pgboss = new PgBoss(config.get("Queue.url"));
  await consumer.work(
    "submission",
    { newJobCheckInterval: 500 },
    submitHandler
  );
}

setupWorker();

/**
 * When a "submission" event is detected, this worker POSTs the data to `job.data.data.webhook_url`
 * The source of this event is the runner, after a user has submitted a form.
 */
export async function submitHandler(job: Job<SubmitJob>) {
  const { data } = job;
  const requestBody = data.data;
  const url = data.webhook_url;
  try {
    const res = await axios.post(url, requestBody);
    const reference = res.data.reference;
    if (reference) {
      return { reference };
    }
  } catch (e: any) {
    throw e;
  }
}
```

When using pgboss, it is important that successful work returns `{ reference }` so that the runner can retrieve the successful response. Thrown errors will be recorded in the database for you to investigate later. Logging has been omitted for brevity, but you should include it!

- The `jobId` is generated when a users' submission is successfully inserted into the queue
- The webhook endpoint should respond with application/json `{ "reference": "FCDO-3252" }`

#### MYSQL Prerequisites

- MySQL database

### Environment variables

| Variable name                  | Definition                                                                               | Default  | Example                                     |
| ------------------------------ | ---------------------------------------------------------------------------------------- | -------- | ------------------------------------------- |
| ENABLE_QUEUE_SERVICE           | Whether the queue service is enabled or not                                              | `false`  |                                             |
| QUEUE_DATABASE_TYPE            | PGBOSS or MYSQL                                                                          |          |                                             |
| QUEUE_DATABASE_URL             | Used for configuring the endpoint of the database instance                               |          | mysql://username:password@endpoint/database |
| QUEUE_DATABASE_USERNAME        | Used for configuring the user being used to access the database                          |          | root                                        |
| QUEUE_DATABASE_PASSWORD        | Used for configuring the password used for accessing the database                        |          | password                                    |
| QUEUE_DATABASE_SCHEMA_NAME     | Used for configuring the schema name that pgboss should use                              | `pgboss` |                                             |
| QUEUE_SERVICE_POLLING_INTERVAL | The amount of time, in milliseconds, between poll requests for updates from the database | 500      |                                             |
| QUEUE_SERVICE_POLLING_TIMEOUT  | The total amount of time, in milliseconds, to poll requests for from the database        | 2000     |                                             |

Webhooks can be configured so that the submitter only attempts to post to the webhook URL once.

```.json
{
  "outputs": [
    {
      "type": "webhook",
      "name": "api",
      "outputConfiguration": {
        "url":"“https://api:9000",
        "allowRetry": false
      }
    }
  ]
}
```

## Running locally

To use the submission queue locally, you will need to have a running instance of a database, the runner, and the
submitter. The easiest way to do this is by using the provided `docker-compose.yml` file.

In that file, you will see the following lines commented out:

```yaml
#      - ENABLE_QUEUE_SERVICE=true
#      - QUEUE_DATABASE_URL=mysql://root:root@mysql:3306/queue
#      - DEBUG="prisma*"
```

```yaml
#  if using MYSQL, uncomment submitter
#  submitter:
#    image: digital-form-builder-submitter
#    build:
#      context: .
#      dockerfile: ./submitter/Dockerfile
#    ports:
#      - "9000:9000"
#    environment:
#      - PORT=9000
#      - QUEUE_DATABASE_URL=mysql://root:root@mysql:3306/queue
#      - QUEUE_POLLING_INTERVAL=5000
#      - DEBUG="prisma*"
#    command: yarn submitter start
#    depends_on:
#      mysql:
#        condition: service_healthy
#  mysql:
#    container_name: mysql
#    image: "mysql:latest"
#    command: --default-authentication-plugin=mysql_native_password
#    ports:
#      - "3306:3306"
#    environment:
#      MYSQL_ROOT_PASSWORD: root
#      MYSQL_DATABASE: queue
#    healthcheck:
#      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
#      timeout: 20s
#      retries: 10

# use psql if you want a PostgreSQL based queue (recommended)
#  postgres:
#    container_name: postgres
#    image: "postgres:16"
#    ports:
#      - "5432:5432"
#    environment:
#      POSTGRES_DB: queue
#      POSTGRES_PASSWORD: root
#      POSTGRES_USER: user
```

Uncommenting the environment variables under the runner configuration will enable the queue service, set the database
url to the url of your mysql container, and turn on debug messages for prisma (the ORM used to communicate with the
database).
Uncommenting the mysql dependency will make sure the mysql server is started before prisma starts trying to connect to
it.
Uncommenting the submitter configuration will trigger the submitter to be created, exposed on port 9000, connecting to
the mysql container, with a polling interval of 5 seconds.

Once your docker-compose file is ready, start all of your containers by using the command `docker compose up`
or `docker compose up -d` to run the containers in detached mode.

## Error codes

If sending the form submission to the queue, or polling the database for the form reference, is not successful the
following errors will be thrown:

| Tags                                        | Example                                                           |
| ------------------------------------------- | ----------------------------------------------------------------- |
| QueueStatusService, outputRequests          | There was an issue sending the submission to the submission queue |
| QueueService, pollForRef, Row ref: [row_id] | Submission row not found                                          |

## Migration guide

### MYSQL to PGBOSS

If you are moving from MYSQL to PGBOSS, ensure you have a worker which will handle the jobs added to your queue. For "zero downtime",

1. Set up any new infrastructure components if necessary (e.g. database and worker)
1. Point the runner to the new components via `QUEUE_DATABASE_URL`
1. Keep the MySQL database as well as the submitter running. Do not delete these yet
1. Deploy new infrastructure components alongside the existing components

Any submissions that have previously failed, or were submitted during deployment, can continue to run and submit to your webhook endpoints.
Check the database to ensure that there are no more failed entries.

You may then safely remove the submitter, and MySQL database (if it is not used for any other purpose).

### PGBOSS v9 to v10

If you are upgrading from v3.33.0-rc.10 to any higher version, you will need to set `QUEUE_DATABASE_SCHEMA_NAME` to a new value, such as `pgboss_v10`. This is so that pgboss can set up it's schema on the first run.

You should keep an old version of your queue worker running for a few minutes, so that messages can be drained form the old schema.
It will then be safe to

1. Delete the old schema
2. Stop the old worker
