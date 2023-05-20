import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import chalk from 'chalk';
import merge from 'just-merge';
import { WorkerChoiceStrategies } from 'poolifier';

import { Constants } from './Constants';
import { Utils } from './Utils';
import {
  ApplicationProtocol,
  type ConfigurationData,
  FileType,
  type StationTemplateUrl,
  type StorageConfiguration,
  StorageType,
  SupervisionUrlDistribution,
  type UIServerConfiguration,
  type WorkerConfiguration,
} from '../types';
import { WorkerConstants, WorkerProcessType } from '../worker';

export class Configuration {
  private static configurationFile = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    'assets',
    'config.json'
  );

  private static configurationFileWatcher: fs.FSWatcher | undefined;
  private static configuration: ConfigurationData | null = null;
  private static configurationChangeCallback: () => Promise<void>;

  private constructor() {
    // This is intentional
  }

  public static setConfigurationChangeCallback(cb: () => Promise<void>): void {
    Configuration.configurationChangeCallback = cb;
  }

  public static getLogStatisticsInterval(): number | undefined {
    Configuration.warnDeprecatedConfigurationKey(
      'statisticsDisplayInterval',
      undefined,
      "Use 'logStatisticsInterval' instead"
    );
    // Read conf
    return Utils.hasOwnProp(Configuration.getConfig(), 'logStatisticsInterval')
      ? Configuration.getConfig()?.logStatisticsInterval
      : Constants.DEFAULT_LOG_STATISTICS_INTERVAL;
  }

  public static getUIServer(): UIServerConfiguration {
    if (Utils.hasOwnProp(Configuration.getConfig(), 'uiWebSocketServer')) {
      console.error(
        chalk`{green ${Configuration.logPrefix()}} {red Deprecated configuration section 'uiWebSocketServer' usage. Use 'uiServer' instead}`
      );
    }
    let uiServerConfiguration: UIServerConfiguration = {
      enabled: false,
      type: ApplicationProtocol.WS,
      options: {
        host: Constants.DEFAULT_UI_SERVER_HOST,
        port: Constants.DEFAULT_UI_SERVER_PORT,
      },
    };
    if (Utils.hasOwnProp(Configuration.getConfig(), 'uiServer')) {
      uiServerConfiguration = merge<UIServerConfiguration>(
        uiServerConfiguration,
        Configuration.getConfig()?.uiServer
      );
    }
    if (Utils.isCFEnvironment() === true) {
      delete uiServerConfiguration.options?.host;
      uiServerConfiguration.options.port = parseInt(process.env.PORT);
    }
    return uiServerConfiguration;
  }

  public static getPerformanceStorage(): StorageConfiguration {
    Configuration.warnDeprecatedConfigurationKey('URI', 'performanceStorage', "Use 'uri' instead");
    let storageConfiguration: StorageConfiguration = {
      enabled: false,
      type: StorageType.JSON_FILE,
      uri: this.getDefaultPerformanceStorageUri(StorageType.JSON_FILE),
    };
    if (Utils.hasOwnProp(Configuration.getConfig(), 'performanceStorage')) {
      storageConfiguration = {
        ...storageConfiguration,
        ...Configuration.getConfig()?.performanceStorage,
        ...(Configuration.getConfig()?.performanceStorage?.type === StorageType.JSON_FILE &&
          Configuration.getConfig()?.performanceStorage?.uri && {
            uri: Configuration.buildPerformanceUriFilePath(
              new URL(Configuration.getConfig()?.performanceStorage?.uri).pathname
            ),
          }),
      };
    }
    return storageConfiguration;
  }

  public static getAutoReconnectMaxRetries(): number | undefined {
    Configuration.warnDeprecatedConfigurationKey(
      'autoReconnectTimeout',
      undefined,
      "Use 'ConnectionTimeOut' OCPP parameter in charging station template instead"
    );
    Configuration.warnDeprecatedConfigurationKey(
      'connectionTimeout',
      undefined,
      "Use 'ConnectionTimeOut' OCPP parameter in charging station template instead"
    );
    Configuration.warnDeprecatedConfigurationKey(
      'autoReconnectMaxRetries',
      undefined,
      'Use it in charging station template instead'
    );
    // Read conf
    if (Utils.hasOwnProp(Configuration.getConfig(), 'autoReconnectMaxRetries')) {
      return Configuration.getConfig()?.autoReconnectMaxRetries;
    }
  }

  public static getStationTemplateUrls(): StationTemplateUrl[] | undefined {
    Configuration.warnDeprecatedConfigurationKey(
      'stationTemplateURLs',
      undefined,
      "Use 'stationTemplateUrls' instead"
    );
    !Utils.isUndefined(Configuration.getConfig()['stationTemplateURLs']) &&
      (Configuration.getConfig().stationTemplateUrls = Configuration.getConfig()[
        'stationTemplateURLs'
      ] as StationTemplateUrl[]);
    Configuration.getConfig().stationTemplateUrls.forEach(
      (stationTemplateUrl: StationTemplateUrl) => {
        if (!Utils.isUndefined(stationTemplateUrl['numberOfStation'])) {
          console.error(
            chalk`{green ${Configuration.logPrefix()}} {red Deprecated configuration key 'numberOfStation' usage for template file '${
              stationTemplateUrl.file
            }' in 'stationTemplateUrls'. Use 'numberOfStations' instead}`
          );
        }
      }
    );
    // Read conf
    return Configuration.getConfig()?.stationTemplateUrls;
  }

  public static getWorker(): WorkerConfiguration {
    Configuration.warnDeprecatedConfigurationKey(
      'useWorkerPool',
      undefined,
      "Use 'worker' section to define the type of worker process model instead"
    );
    Configuration.warnDeprecatedConfigurationKey(
      'workerProcess',
      undefined,
      "Use 'worker' section to define the type of worker process model instead"
    );
    Configuration.warnDeprecatedConfigurationKey(
      'workerStartDelay',
      undefined,
      "Use 'worker' section to define the worker start delay instead"
    );
    Configuration.warnDeprecatedConfigurationKey(
      'chargingStationsPerWorker',
      undefined,
      "Use 'worker' section to define the number of element(s) per worker instead"
    );
    Configuration.warnDeprecatedConfigurationKey(
      'elementStartDelay',
      undefined,
      "Use 'worker' section to define the worker's element start delay instead"
    );
    Configuration.warnDeprecatedConfigurationKey(
      'workerPoolMinSize',
      undefined,
      "Use 'worker' section to define the worker pool minimum size instead"
    );
    Configuration.warnDeprecatedConfigurationKey(
      'workerPoolSize;',
      undefined,
      "Use 'worker' section to define the worker pool maximum size instead"
    );
    Configuration.warnDeprecatedConfigurationKey(
      'workerPoolMaxSize;',
      undefined,
      "Use 'worker' section to define the worker pool maximum size instead"
    );
    Configuration.warnDeprecatedConfigurationKey(
      'workerPoolStrategy;',
      undefined,
      "Use 'worker' section to define the worker pool strategy instead"
    );
    let workerConfiguration: WorkerConfiguration = {
      processType: Utils.hasOwnProp(Configuration.getConfig(), 'workerProcess')
        ? Configuration.getConfig()?.workerProcess
        : WorkerProcessType.workerSet,
      startDelay: Utils.hasOwnProp(Configuration.getConfig(), 'workerStartDelay')
        ? Configuration.getConfig()?.workerStartDelay
        : WorkerConstants.DEFAULT_WORKER_START_DELAY,
      elementsPerWorker: Utils.hasOwnProp(Configuration.getConfig(), 'chargingStationsPerWorker')
        ? Configuration.getConfig()?.chargingStationsPerWorker
        : WorkerConstants.DEFAULT_ELEMENTS_PER_WORKER,
      elementStartDelay: Utils.hasOwnProp(Configuration.getConfig(), 'elementStartDelay')
        ? Configuration.getConfig()?.elementStartDelay
        : WorkerConstants.DEFAULT_ELEMENT_START_DELAY,
      poolMinSize: Utils.hasOwnProp(Configuration.getConfig(), 'workerPoolMinSize')
        ? Configuration.getConfig()?.workerPoolMinSize
        : WorkerConstants.DEFAULT_POOL_MIN_SIZE,
      poolMaxSize: Utils.hasOwnProp(Configuration.getConfig(), 'workerPoolMaxSize')
        ? Configuration.getConfig()?.workerPoolMaxSize
        : WorkerConstants.DEFAULT_POOL_MAX_SIZE,
      poolStrategy:
        Configuration.getConfig()?.workerPoolStrategy ?? WorkerChoiceStrategies.ROUND_ROBIN,
    };
    if (Utils.hasOwnProp(Configuration.getConfig(), 'worker')) {
      workerConfiguration = { ...workerConfiguration, ...Configuration.getConfig()?.worker };
    }
    return workerConfiguration;
  }

  public static workerPoolInUse(): boolean {
    return [WorkerProcessType.dynamicPool, WorkerProcessType.staticPool].includes(
      Configuration.getWorker().processType
    );
  }

  public static workerDynamicPoolInUse(): boolean {
    return Configuration.getWorker().processType === WorkerProcessType.dynamicPool;
  }

  public static getLogConsole(): boolean | undefined {
    Configuration.warnDeprecatedConfigurationKey(
      'consoleLog',
      undefined,
      "Use 'logConsole' instead"
    );
    return Utils.hasOwnProp(Configuration.getConfig(), 'logConsole')
      ? Configuration.getConfig()?.logConsole
      : false;
  }

  public static getLogFormat(): string | undefined {
    return Utils.hasOwnProp(Configuration.getConfig(), 'logFormat')
      ? Configuration.getConfig()?.logFormat
      : 'simple';
  }

  public static getLogRotate(): boolean | undefined {
    return Utils.hasOwnProp(Configuration.getConfig(), 'logRotate')
      ? Configuration.getConfig()?.logRotate
      : true;
  }

  public static getLogMaxFiles(): number | string | false | undefined {
    return (
      Utils.hasOwnProp(Configuration.getConfig(), 'logMaxFiles') &&
      Configuration.getConfig()?.logMaxFiles
    );
  }

  public static getLogMaxSize(): number | string | false | undefined {
    return (
      Utils.hasOwnProp(Configuration.getConfig(), 'logMaxFiles') &&
      Configuration.getConfig()?.logMaxSize
    );
  }

  public static getLogLevel(): string | undefined {
    return Utils.hasOwnProp(Configuration.getConfig(), 'logLevel')
      ? Configuration.getConfig()?.logLevel?.toLowerCase()
      : 'info';
  }

  public static getLogFile(): string | undefined {
    return Utils.hasOwnProp(Configuration.getConfig(), 'logFile')
      ? Configuration.getConfig()?.logFile
      : 'combined.log';
  }

  public static getLogErrorFile(): string | undefined {
    Configuration.warnDeprecatedConfigurationKey(
      'errorFile',
      undefined,
      "Use 'logErrorFile' instead"
    );
    return Utils.hasOwnProp(Configuration.getConfig(), 'logErrorFile')
      ? Configuration.getConfig()?.logErrorFile
      : 'error.log';
  }

  public static getSupervisionUrls(): string | string[] | undefined {
    Configuration.warnDeprecatedConfigurationKey(
      'supervisionURLs',
      undefined,
      "Use 'supervisionUrls' instead"
    );
    !Utils.isUndefined(Configuration.getConfig()['supervisionURLs']) &&
      (Configuration.getConfig().supervisionUrls = Configuration.getConfig()['supervisionURLs'] as
        | string
        | string[]);
    // Read conf
    return Configuration.getConfig()?.supervisionUrls;
  }

  public static getSupervisionUrlDistribution(): SupervisionUrlDistribution | undefined {
    Configuration.warnDeprecatedConfigurationKey(
      'distributeStationToTenantEqually',
      undefined,
      "Use 'supervisionUrlDistribution' instead"
    );
    Configuration.warnDeprecatedConfigurationKey(
      'distributeStationsToTenantsEqually',
      undefined,
      "Use 'supervisionUrlDistribution' instead"
    );
    return Utils.hasOwnProp(Configuration.getConfig(), 'supervisionUrlDistribution')
      ? Configuration.getConfig()?.supervisionUrlDistribution
      : SupervisionUrlDistribution.ROUND_ROBIN;
  }

  private static logPrefix = (): string => {
    return `${new Date().toLocaleString()} Simulator configuration |`;
  };

  private static warnDeprecatedConfigurationKey(
    key: string,
    sectionName?: string,
    logMsgToAppend = ''
  ) {
    if (
      sectionName &&
      !Utils.isUndefined(Configuration.getConfig()[sectionName]) &&
      !Utils.isUndefined((Configuration.getConfig()[sectionName] as Record<string, unknown>)[key])
    ) {
      console.error(
        chalk`{green ${Configuration.logPrefix()}} {red Deprecated configuration key '${key}' usage in section '${sectionName}'${
          logMsgToAppend.trim().length > 0 ? `. ${logMsgToAppend}` : ''
        }}`
      );
    } else if (!Utils.isUndefined(Configuration.getConfig()[key])) {
      console.error(
        chalk`{green ${Configuration.logPrefix()}} {red Deprecated configuration key '${key}' usage${
          logMsgToAppend.trim().length > 0 ? `. ${logMsgToAppend}` : ''
        }}`
      );
    }
  }

  // Read the config file
  private static getConfig(): ConfigurationData | null {
    if (!Configuration.configuration) {
      try {
        Configuration.configuration = JSON.parse(
          fs.readFileSync(Configuration.configurationFile, 'utf8')
        ) as ConfigurationData;
      } catch (error) {
        Configuration.handleFileException(
          Configuration.configurationFile,
          FileType.Configuration,
          error as NodeJS.ErrnoException,
          Configuration.logPrefix()
        );
      }
      if (!Configuration.configurationFileWatcher) {
        Configuration.configurationFileWatcher = Configuration.getConfigurationFileWatcher();
      }
    }
    return Configuration.configuration;
  }

  private static getConfigurationFileWatcher(): fs.FSWatcher | undefined {
    try {
      return fs.watch(Configuration.configurationFile, (event, filename): void => {
        if (filename?.trim().length > 0 && event === 'change') {
          // Nullify to force configuration file reading
          Configuration.configuration = null;
          if (!Utils.isUndefined(Configuration.configurationChangeCallback)) {
            Configuration.configurationChangeCallback().catch((error) => {
              throw typeof error === 'string' ? new Error(error) : error;
            });
          }
        }
      });
    } catch (error) {
      Configuration.handleFileException(
        Configuration.configurationFile,
        FileType.Configuration,
        error as NodeJS.ErrnoException,
        Configuration.logPrefix()
      );
    }
  }

  private static handleFileException(
    file: string,
    fileType: FileType,
    error: NodeJS.ErrnoException,
    logPrefix: string
  ): void {
    const prefix = Utils.isNotEmptyString(logPrefix) ? `${logPrefix} ` : '';
    let logMsg: string;
    switch (error.code) {
      case 'ENOENT':
        logMsg = `${fileType} file ${file} not found:`;
        break;
      case 'EEXIST':
        logMsg = `${fileType} file ${file} already exists:`;
        break;
      case 'EACCES':
        logMsg = `${fileType} file ${file} access denied:`;
        break;
      default:
        logMsg = `${fileType} file ${file} error:`;
    }
    console.warn(`${chalk.green(prefix)}${chalk.yellow(`${logMsg} `)}`, error);
  }

  private static getDefaultPerformanceStorageUri(storageType: StorageType) {
    switch (storageType) {
      case StorageType.JSON_FILE:
        return Configuration.buildPerformanceUriFilePath(
          Constants.DEFAULT_PERFORMANCE_RECORDS_FILENAME
        );
      case StorageType.SQLITE:
        return Configuration.buildPerformanceUriFilePath(
          `${Constants.DEFAULT_PERFORMANCE_RECORDS_DB_NAME}.db`
        );
      default:
        throw new Error(`Performance storage URI is mandatory with storage type '${storageType}'`);
    }
  }

  private static buildPerformanceUriFilePath(file: string) {
    return `file://${path.join(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../'),
      file
    )}`;
  }
}
