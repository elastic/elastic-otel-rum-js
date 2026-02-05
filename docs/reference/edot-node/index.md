---
navigation_title: EDOT Browser
description: Introduction to the Elastic Distribution of OpenTelemetry Browser (EDOT Browser).
applies_to:
  stack:
  serverless:
    observability:
  product:
    edot_browser: ga
products:
  - id: cloud-serverless
  - id: observability
  - id: edot-sdk
  - id: apm-agent
---

# Elastic Distribution of OpenTelemetry Browser

The {{edot}} (EDOT) Browser is a light wrapper around the [OpenTelemetry SDK for Browser](https://opentelemetry.io/docs/languages/js), configured for the best experience with Elastic Observability.

Use EDOT Browser to start the OpenTelemetry SDK with your Browser application, and automatically capture tracing data, performance metrics, and logs. Traces, metrics, and logs can be sent to any OpenTelemetry Protocol (OTLP) Collector you choose.

A goal of this distribution is to avoid introducing proprietary concepts in addition to those defined by the wider OpenTelemetry community. For any additional features introduced, Elastic aims at contributing them back to the OpenTelemetry project.

## Features

In addition to all the features of OpenTelemetry Browser, with EDOT Browser you have access to the following:

* A single package that includes several OpenTelemetry packages as dependencies, so you only need to install and update a single package (for most use cases). This is similar to OpenTelemetry's `@opentelemetry/auto-instrumentations-web` package.
* Improvements and bug fixes contributed by the Elastic team before the changes are available in OpenTelemetry repositories.
* Optional features that can enhance OpenTelemetry data that is being sent to Elastic.
* Elastic-specific processors that ensure optimal compatibility when exporting OpenTelemetry signal data to an Elastic backend like an Elastic Observability deployment.
* Pre-configured collection of tracing and metrics signals, applying some opinionated defaults, such as which sources are collected by default.

Use EDOT Browser with your Browser application to automatically capture distributed tracing data, performance metrics, and logs. EDOT Browser automatically instruments [popular modules](/reference/edot-browser/supported-technologies.md#instrumentations) used by your service.

Follow the step-by-step instructions in [Setup](/reference/edot-browser/setup/index.md) to get started.

## Release notes

For the latest release notes, including known issues, deprecations, and breaking changes, refer to [EDOT Browser release notes](/release-notes/index.md)
