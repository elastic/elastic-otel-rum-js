(() => {
  // node_modules/@opentelemetry/api/build/esm/platform/browser/globalThis.js
  var _globalThis = typeof globalThis === "object" ? globalThis : typeof self === "object" ? self : typeof window === "object" ? window : typeof global === "object" ? global : {};

  // node_modules/@opentelemetry/api/build/esm/version.js
  var VERSION = "1.9.0";

  // node_modules/@opentelemetry/api/build/esm/internal/semver.js
  var re = /^(\d+)\.(\d+)\.(\d+)(-(.+))?$/;
  function _makeCompatibilityCheck(ownVersion) {
    var acceptedVersions = /* @__PURE__ */ new Set([ownVersion]);
    var rejectedVersions = /* @__PURE__ */ new Set();
    var myVersionMatch = ownVersion.match(re);
    if (!myVersionMatch) {
      return function() {
        return false;
      };
    }
    var ownVersionParsed = {
      major: +myVersionMatch[1],
      minor: +myVersionMatch[2],
      patch: +myVersionMatch[3],
      prerelease: myVersionMatch[4]
    };
    if (ownVersionParsed.prerelease != null) {
      return function isExactmatch(globalVersion) {
        return globalVersion === ownVersion;
      };
    }
    function _reject(v) {
      rejectedVersions.add(v);
      return false;
    }
    function _accept(v) {
      acceptedVersions.add(v);
      return true;
    }
    return function isCompatible2(globalVersion) {
      if (acceptedVersions.has(globalVersion)) {
        return true;
      }
      if (rejectedVersions.has(globalVersion)) {
        return false;
      }
      var globalVersionMatch = globalVersion.match(re);
      if (!globalVersionMatch) {
        return _reject(globalVersion);
      }
      var globalVersionParsed = {
        major: +globalVersionMatch[1],
        minor: +globalVersionMatch[2],
        patch: +globalVersionMatch[3],
        prerelease: globalVersionMatch[4]
      };
      if (globalVersionParsed.prerelease != null) {
        return _reject(globalVersion);
      }
      if (ownVersionParsed.major !== globalVersionParsed.major) {
        return _reject(globalVersion);
      }
      if (ownVersionParsed.major === 0) {
        if (ownVersionParsed.minor === globalVersionParsed.minor && ownVersionParsed.patch <= globalVersionParsed.patch) {
          return _accept(globalVersion);
        }
        return _reject(globalVersion);
      }
      if (ownVersionParsed.minor <= globalVersionParsed.minor) {
        return _accept(globalVersion);
      }
      return _reject(globalVersion);
    };
  }
  var isCompatible = _makeCompatibilityCheck(VERSION);

  // node_modules/@opentelemetry/api/build/esm/internal/global-utils.js
  var major = VERSION.split(".")[0];
  var GLOBAL_OPENTELEMETRY_API_KEY = /* @__PURE__ */ Symbol.for("opentelemetry.js.api." + major);
  var _global = _globalThis;
  function registerGlobal(type, instance, diag3, allowOverride) {
    var _a;
    if (allowOverride === void 0) {
      allowOverride = false;
    }
    var api = _global[GLOBAL_OPENTELEMETRY_API_KEY] = (_a = _global[GLOBAL_OPENTELEMETRY_API_KEY]) !== null && _a !== void 0 ? _a : {
      version: VERSION
    };
    if (!allowOverride && api[type]) {
      var err = new Error("@opentelemetry/api: Attempted duplicate registration of API: " + type);
      diag3.error(err.stack || err.message);
      return false;
    }
    if (api.version !== VERSION) {
      var err = new Error("@opentelemetry/api: Registration of version v" + api.version + " for " + type + " does not match previously registered API v" + VERSION);
      diag3.error(err.stack || err.message);
      return false;
    }
    api[type] = instance;
    diag3.debug("@opentelemetry/api: Registered a global for " + type + " v" + VERSION + ".");
    return true;
  }
  function getGlobal(type) {
    var _a, _b;
    var globalVersion = (_a = _global[GLOBAL_OPENTELEMETRY_API_KEY]) === null || _a === void 0 ? void 0 : _a.version;
    if (!globalVersion || !isCompatible(globalVersion)) {
      return;
    }
    return (_b = _global[GLOBAL_OPENTELEMETRY_API_KEY]) === null || _b === void 0 ? void 0 : _b[type];
  }
  function unregisterGlobal(type, diag3) {
    diag3.debug("@opentelemetry/api: Unregistering a global for " + type + " v" + VERSION + ".");
    var api = _global[GLOBAL_OPENTELEMETRY_API_KEY];
    if (api) {
      delete api[type];
    }
  }

  // node_modules/@opentelemetry/api/build/esm/diag/ComponentLogger.js
  var __read = function(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
      while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    } catch (error) {
      e = { error };
    } finally {
      try {
        if (r && !r.done && (m = i["return"])) m.call(i);
      } finally {
        if (e) throw e.error;
      }
    }
    return ar;
  };
  var __spreadArray = function(to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
      if (ar || !(i in from)) {
        if (!ar) ar = Array.prototype.slice.call(from, 0, i);
        ar[i] = from[i];
      }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
  };
  var DiagComponentLogger = (
    /** @class */
    (function() {
      function DiagComponentLogger2(props) {
        this._namespace = props.namespace || "DiagComponentLogger";
      }
      DiagComponentLogger2.prototype.debug = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return logProxy("debug", this._namespace, args);
      };
      DiagComponentLogger2.prototype.error = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return logProxy("error", this._namespace, args);
      };
      DiagComponentLogger2.prototype.info = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return logProxy("info", this._namespace, args);
      };
      DiagComponentLogger2.prototype.warn = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return logProxy("warn", this._namespace, args);
      };
      DiagComponentLogger2.prototype.verbose = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return logProxy("verbose", this._namespace, args);
      };
      return DiagComponentLogger2;
    })()
  );
  function logProxy(funcName, namespace, args) {
    var logger2 = getGlobal("diag");
    if (!logger2) {
      return;
    }
    args.unshift(namespace);
    return logger2[funcName].apply(logger2, __spreadArray([], __read(args), false));
  }

  // node_modules/@opentelemetry/api/build/esm/diag/types.js
  var DiagLogLevel;
  (function(DiagLogLevel2) {
    DiagLogLevel2[DiagLogLevel2["NONE"] = 0] = "NONE";
    DiagLogLevel2[DiagLogLevel2["ERROR"] = 30] = "ERROR";
    DiagLogLevel2[DiagLogLevel2["WARN"] = 50] = "WARN";
    DiagLogLevel2[DiagLogLevel2["INFO"] = 60] = "INFO";
    DiagLogLevel2[DiagLogLevel2["DEBUG"] = 70] = "DEBUG";
    DiagLogLevel2[DiagLogLevel2["VERBOSE"] = 80] = "VERBOSE";
    DiagLogLevel2[DiagLogLevel2["ALL"] = 9999] = "ALL";
  })(DiagLogLevel || (DiagLogLevel = {}));

  // node_modules/@opentelemetry/api/build/esm/diag/internal/logLevelLogger.js
  function createLogLevelDiagLogger(maxLevel, logger2) {
    if (maxLevel < DiagLogLevel.NONE) {
      maxLevel = DiagLogLevel.NONE;
    } else if (maxLevel > DiagLogLevel.ALL) {
      maxLevel = DiagLogLevel.ALL;
    }
    logger2 = logger2 || {};
    function _filterFunc(funcName, theLevel) {
      var theFunc = logger2[funcName];
      if (typeof theFunc === "function" && maxLevel >= theLevel) {
        return theFunc.bind(logger2);
      }
      return function() {
      };
    }
    return {
      error: _filterFunc("error", DiagLogLevel.ERROR),
      warn: _filterFunc("warn", DiagLogLevel.WARN),
      info: _filterFunc("info", DiagLogLevel.INFO),
      debug: _filterFunc("debug", DiagLogLevel.DEBUG),
      verbose: _filterFunc("verbose", DiagLogLevel.VERBOSE)
    };
  }

  // node_modules/@opentelemetry/api/build/esm/api/diag.js
  var __read2 = function(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
      while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    } catch (error) {
      e = { error };
    } finally {
      try {
        if (r && !r.done && (m = i["return"])) m.call(i);
      } finally {
        if (e) throw e.error;
      }
    }
    return ar;
  };
  var __spreadArray2 = function(to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
      if (ar || !(i in from)) {
        if (!ar) ar = Array.prototype.slice.call(from, 0, i);
        ar[i] = from[i];
      }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
  };
  var API_NAME = "diag";
  var DiagAPI = (
    /** @class */
    (function() {
      function DiagAPI2() {
        function _logProxy(funcName) {
          return function() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
            }
            var logger2 = getGlobal("diag");
            if (!logger2)
              return;
            return logger2[funcName].apply(logger2, __spreadArray2([], __read2(args), false));
          };
        }
        var self2 = this;
        var setLogger = function(logger2, optionsOrLogLevel) {
          var _a, _b, _c;
          if (optionsOrLogLevel === void 0) {
            optionsOrLogLevel = { logLevel: DiagLogLevel.INFO };
          }
          if (logger2 === self2) {
            var err = new Error("Cannot use diag as the logger for itself. Please use a DiagLogger implementation like ConsoleDiagLogger or a custom implementation");
            self2.error((_a = err.stack) !== null && _a !== void 0 ? _a : err.message);
            return false;
          }
          if (typeof optionsOrLogLevel === "number") {
            optionsOrLogLevel = {
              logLevel: optionsOrLogLevel
            };
          }
          var oldLogger = getGlobal("diag");
          var newLogger = createLogLevelDiagLogger((_b = optionsOrLogLevel.logLevel) !== null && _b !== void 0 ? _b : DiagLogLevel.INFO, logger2);
          if (oldLogger && !optionsOrLogLevel.suppressOverrideMessage) {
            var stack = (_c = new Error().stack) !== null && _c !== void 0 ? _c : "<failed to generate stacktrace>";
            oldLogger.warn("Current logger will be overwritten from " + stack);
            newLogger.warn("Current logger will overwrite one already registered from " + stack);
          }
          return registerGlobal("diag", newLogger, self2, true);
        };
        self2.setLogger = setLogger;
        self2.disable = function() {
          unregisterGlobal(API_NAME, self2);
        };
        self2.createComponentLogger = function(options) {
          return new DiagComponentLogger(options);
        };
        self2.verbose = _logProxy("verbose");
        self2.debug = _logProxy("debug");
        self2.info = _logProxy("info");
        self2.warn = _logProxy("warn");
        self2.error = _logProxy("error");
      }
      DiagAPI2.instance = function() {
        if (!this._instance) {
          this._instance = new DiagAPI2();
        }
        return this._instance;
      };
      return DiagAPI2;
    })()
  );

  // node_modules/@opentelemetry/api/build/esm/baggage/internal/baggage-impl.js
  var __read3 = function(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
      while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    } catch (error) {
      e = { error };
    } finally {
      try {
        if (r && !r.done && (m = i["return"])) m.call(i);
      } finally {
        if (e) throw e.error;
      }
    }
    return ar;
  };
  var __values = function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
      next: function() {
        if (o && i >= o.length) o = void 0;
        return { value: o && o[i++], done: !o };
      }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
  };
  var BaggageImpl = (
    /** @class */
    (function() {
      function BaggageImpl2(entries) {
        this._entries = entries ? new Map(entries) : /* @__PURE__ */ new Map();
      }
      BaggageImpl2.prototype.getEntry = function(key) {
        var entry = this._entries.get(key);
        if (!entry) {
          return void 0;
        }
        return Object.assign({}, entry);
      };
      BaggageImpl2.prototype.getAllEntries = function() {
        return Array.from(this._entries.entries()).map(function(_a) {
          var _b = __read3(_a, 2), k = _b[0], v = _b[1];
          return [k, v];
        });
      };
      BaggageImpl2.prototype.setEntry = function(key, entry) {
        var newBaggage = new BaggageImpl2(this._entries);
        newBaggage._entries.set(key, entry);
        return newBaggage;
      };
      BaggageImpl2.prototype.removeEntry = function(key) {
        var newBaggage = new BaggageImpl2(this._entries);
        newBaggage._entries.delete(key);
        return newBaggage;
      };
      BaggageImpl2.prototype.removeEntries = function() {
        var e_1, _a;
        var keys = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          keys[_i] = arguments[_i];
        }
        var newBaggage = new BaggageImpl2(this._entries);
        try {
          for (var keys_1 = __values(keys), keys_1_1 = keys_1.next(); !keys_1_1.done; keys_1_1 = keys_1.next()) {
            var key = keys_1_1.value;
            newBaggage._entries.delete(key);
          }
        } catch (e_1_1) {
          e_1 = { error: e_1_1 };
        } finally {
          try {
            if (keys_1_1 && !keys_1_1.done && (_a = keys_1.return)) _a.call(keys_1);
          } finally {
            if (e_1) throw e_1.error;
          }
        }
        return newBaggage;
      };
      BaggageImpl2.prototype.clear = function() {
        return new BaggageImpl2();
      };
      return BaggageImpl2;
    })()
  );

  // node_modules/@opentelemetry/api/build/esm/baggage/internal/symbol.js
  var baggageEntryMetadataSymbol = /* @__PURE__ */ Symbol("BaggageEntryMetadata");

  // node_modules/@opentelemetry/api/build/esm/baggage/utils.js
  var diag = DiagAPI.instance();
  function createBaggage(entries) {
    if (entries === void 0) {
      entries = {};
    }
    return new BaggageImpl(new Map(Object.entries(entries)));
  }
  function baggageEntryMetadataFromString(str) {
    if (typeof str !== "string") {
      diag.error("Cannot create baggage metadata from unknown type: " + typeof str);
      str = "";
    }
    return {
      __TYPE__: baggageEntryMetadataSymbol,
      toString: function() {
        return str;
      }
    };
  }

  // node_modules/@opentelemetry/api/build/esm/context/context.js
  function createContextKey(description) {
    return Symbol.for(description);
  }
  var BaseContext = (
    /** @class */
    /* @__PURE__ */ (function() {
      function BaseContext2(parentContext) {
        var self2 = this;
        self2._currentContext = parentContext ? new Map(parentContext) : /* @__PURE__ */ new Map();
        self2.getValue = function(key) {
          return self2._currentContext.get(key);
        };
        self2.setValue = function(key, value) {
          var context2 = new BaseContext2(self2._currentContext);
          context2._currentContext.set(key, value);
          return context2;
        };
        self2.deleteValue = function(key) {
          var context2 = new BaseContext2(self2._currentContext);
          context2._currentContext.delete(key);
          return context2;
        };
      }
      return BaseContext2;
    })()
  );
  var ROOT_CONTEXT = new BaseContext();

  // node_modules/@opentelemetry/api/build/esm/metrics/NoopMeter.js
  var __extends = /* @__PURE__ */ (function() {
    var extendStatics = function(d, b) {
      extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
        d2.__proto__ = b2;
      } || function(d2, b2) {
        for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
      };
      return extendStatics(d, b);
    };
    return function(d, b) {
      if (typeof b !== "function" && b !== null)
        throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
      extendStatics(d, b);
      function __() {
        this.constructor = d;
      }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
  })();
  var NoopMeter = (
    /** @class */
    (function() {
      function NoopMeter2() {
      }
      NoopMeter2.prototype.createGauge = function(_name, _options) {
        return NOOP_GAUGE_METRIC;
      };
      NoopMeter2.prototype.createHistogram = function(_name, _options) {
        return NOOP_HISTOGRAM_METRIC;
      };
      NoopMeter2.prototype.createCounter = function(_name, _options) {
        return NOOP_COUNTER_METRIC;
      };
      NoopMeter2.prototype.createUpDownCounter = function(_name, _options) {
        return NOOP_UP_DOWN_COUNTER_METRIC;
      };
      NoopMeter2.prototype.createObservableGauge = function(_name, _options) {
        return NOOP_OBSERVABLE_GAUGE_METRIC;
      };
      NoopMeter2.prototype.createObservableCounter = function(_name, _options) {
        return NOOP_OBSERVABLE_COUNTER_METRIC;
      };
      NoopMeter2.prototype.createObservableUpDownCounter = function(_name, _options) {
        return NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC;
      };
      NoopMeter2.prototype.addBatchObservableCallback = function(_callback, _observables) {
      };
      NoopMeter2.prototype.removeBatchObservableCallback = function(_callback) {
      };
      return NoopMeter2;
    })()
  );
  var NoopMetric = (
    /** @class */
    /* @__PURE__ */ (function() {
      function NoopMetric2() {
      }
      return NoopMetric2;
    })()
  );
  var NoopCounterMetric = (
    /** @class */
    (function(_super) {
      __extends(NoopCounterMetric2, _super);
      function NoopCounterMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      NoopCounterMetric2.prototype.add = function(_value, _attributes) {
      };
      return NoopCounterMetric2;
    })(NoopMetric)
  );
  var NoopUpDownCounterMetric = (
    /** @class */
    (function(_super) {
      __extends(NoopUpDownCounterMetric2, _super);
      function NoopUpDownCounterMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      NoopUpDownCounterMetric2.prototype.add = function(_value, _attributes) {
      };
      return NoopUpDownCounterMetric2;
    })(NoopMetric)
  );
  var NoopGaugeMetric = (
    /** @class */
    (function(_super) {
      __extends(NoopGaugeMetric2, _super);
      function NoopGaugeMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      NoopGaugeMetric2.prototype.record = function(_value, _attributes) {
      };
      return NoopGaugeMetric2;
    })(NoopMetric)
  );
  var NoopHistogramMetric = (
    /** @class */
    (function(_super) {
      __extends(NoopHistogramMetric2, _super);
      function NoopHistogramMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      NoopHistogramMetric2.prototype.record = function(_value, _attributes) {
      };
      return NoopHistogramMetric2;
    })(NoopMetric)
  );
  var NoopObservableMetric = (
    /** @class */
    (function() {
      function NoopObservableMetric2() {
      }
      NoopObservableMetric2.prototype.addCallback = function(_callback) {
      };
      NoopObservableMetric2.prototype.removeCallback = function(_callback) {
      };
      return NoopObservableMetric2;
    })()
  );
  var NoopObservableCounterMetric = (
    /** @class */
    (function(_super) {
      __extends(NoopObservableCounterMetric2, _super);
      function NoopObservableCounterMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      return NoopObservableCounterMetric2;
    })(NoopObservableMetric)
  );
  var NoopObservableGaugeMetric = (
    /** @class */
    (function(_super) {
      __extends(NoopObservableGaugeMetric2, _super);
      function NoopObservableGaugeMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      return NoopObservableGaugeMetric2;
    })(NoopObservableMetric)
  );
  var NoopObservableUpDownCounterMetric = (
    /** @class */
    (function(_super) {
      __extends(NoopObservableUpDownCounterMetric2, _super);
      function NoopObservableUpDownCounterMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      return NoopObservableUpDownCounterMetric2;
    })(NoopObservableMetric)
  );
  var NOOP_METER = new NoopMeter();
  var NOOP_COUNTER_METRIC = new NoopCounterMetric();
  var NOOP_GAUGE_METRIC = new NoopGaugeMetric();
  var NOOP_HISTOGRAM_METRIC = new NoopHistogramMetric();
  var NOOP_UP_DOWN_COUNTER_METRIC = new NoopUpDownCounterMetric();
  var NOOP_OBSERVABLE_COUNTER_METRIC = new NoopObservableCounterMetric();
  var NOOP_OBSERVABLE_GAUGE_METRIC = new NoopObservableGaugeMetric();
  var NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC = new NoopObservableUpDownCounterMetric();
  function createNoopMeter() {
    return NOOP_METER;
  }

  // node_modules/@opentelemetry/api/build/esm/metrics/Metric.js
  var ValueType;
  (function(ValueType2) {
    ValueType2[ValueType2["INT"] = 0] = "INT";
    ValueType2[ValueType2["DOUBLE"] = 1] = "DOUBLE";
  })(ValueType || (ValueType = {}));

  // node_modules/@opentelemetry/api/build/esm/propagation/TextMapPropagator.js
  var defaultTextMapGetter = {
    get: function(carrier, key) {
      if (carrier == null) {
        return void 0;
      }
      return carrier[key];
    },
    keys: function(carrier) {
      if (carrier == null) {
        return [];
      }
      return Object.keys(carrier);
    }
  };
  var defaultTextMapSetter = {
    set: function(carrier, key, value) {
      if (carrier == null) {
        return;
      }
      carrier[key] = value;
    }
  };

  // node_modules/@opentelemetry/api/build/esm/context/NoopContextManager.js
  var __read4 = function(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
      while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    } catch (error) {
      e = { error };
    } finally {
      try {
        if (r && !r.done && (m = i["return"])) m.call(i);
      } finally {
        if (e) throw e.error;
      }
    }
    return ar;
  };
  var __spreadArray3 = function(to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
      if (ar || !(i in from)) {
        if (!ar) ar = Array.prototype.slice.call(from, 0, i);
        ar[i] = from[i];
      }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
  };
  var NoopContextManager = (
    /** @class */
    (function() {
      function NoopContextManager2() {
      }
      NoopContextManager2.prototype.active = function() {
        return ROOT_CONTEXT;
      };
      NoopContextManager2.prototype.with = function(_context, fn, thisArg) {
        var args = [];
        for (var _i = 3; _i < arguments.length; _i++) {
          args[_i - 3] = arguments[_i];
        }
        return fn.call.apply(fn, __spreadArray3([thisArg], __read4(args), false));
      };
      NoopContextManager2.prototype.bind = function(_context, target) {
        return target;
      };
      NoopContextManager2.prototype.enable = function() {
        return this;
      };
      NoopContextManager2.prototype.disable = function() {
        return this;
      };
      return NoopContextManager2;
    })()
  );

  // node_modules/@opentelemetry/api/build/esm/api/context.js
  var __read5 = function(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
      while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    } catch (error) {
      e = { error };
    } finally {
      try {
        if (r && !r.done && (m = i["return"])) m.call(i);
      } finally {
        if (e) throw e.error;
      }
    }
    return ar;
  };
  var __spreadArray4 = function(to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
      if (ar || !(i in from)) {
        if (!ar) ar = Array.prototype.slice.call(from, 0, i);
        ar[i] = from[i];
      }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
  };
  var API_NAME2 = "context";
  var NOOP_CONTEXT_MANAGER = new NoopContextManager();
  var ContextAPI = (
    /** @class */
    (function() {
      function ContextAPI2() {
      }
      ContextAPI2.getInstance = function() {
        if (!this._instance) {
          this._instance = new ContextAPI2();
        }
        return this._instance;
      };
      ContextAPI2.prototype.setGlobalContextManager = function(contextManager) {
        return registerGlobal(API_NAME2, contextManager, DiagAPI.instance());
      };
      ContextAPI2.prototype.active = function() {
        return this._getContextManager().active();
      };
      ContextAPI2.prototype.with = function(context2, fn, thisArg) {
        var _a;
        var args = [];
        for (var _i = 3; _i < arguments.length; _i++) {
          args[_i - 3] = arguments[_i];
        }
        return (_a = this._getContextManager()).with.apply(_a, __spreadArray4([context2, fn, thisArg], __read5(args), false));
      };
      ContextAPI2.prototype.bind = function(context2, target) {
        return this._getContextManager().bind(context2, target);
      };
      ContextAPI2.prototype._getContextManager = function() {
        return getGlobal(API_NAME2) || NOOP_CONTEXT_MANAGER;
      };
      ContextAPI2.prototype.disable = function() {
        this._getContextManager().disable();
        unregisterGlobal(API_NAME2, DiagAPI.instance());
      };
      return ContextAPI2;
    })()
  );

  // node_modules/@opentelemetry/api/build/esm/trace/trace_flags.js
  var TraceFlags;
  (function(TraceFlags2) {
    TraceFlags2[TraceFlags2["NONE"] = 0] = "NONE";
    TraceFlags2[TraceFlags2["SAMPLED"] = 1] = "SAMPLED";
  })(TraceFlags || (TraceFlags = {}));

  // node_modules/@opentelemetry/api/build/esm/trace/invalid-span-constants.js
  var INVALID_SPANID = "0000000000000000";
  var INVALID_TRACEID = "00000000000000000000000000000000";
  var INVALID_SPAN_CONTEXT = {
    traceId: INVALID_TRACEID,
    spanId: INVALID_SPANID,
    traceFlags: TraceFlags.NONE
  };

  // node_modules/@opentelemetry/api/build/esm/trace/NonRecordingSpan.js
  var NonRecordingSpan = (
    /** @class */
    (function() {
      function NonRecordingSpan2(_spanContext) {
        if (_spanContext === void 0) {
          _spanContext = INVALID_SPAN_CONTEXT;
        }
        this._spanContext = _spanContext;
      }
      NonRecordingSpan2.prototype.spanContext = function() {
        return this._spanContext;
      };
      NonRecordingSpan2.prototype.setAttribute = function(_key, _value) {
        return this;
      };
      NonRecordingSpan2.prototype.setAttributes = function(_attributes) {
        return this;
      };
      NonRecordingSpan2.prototype.addEvent = function(_name, _attributes) {
        return this;
      };
      NonRecordingSpan2.prototype.addLink = function(_link) {
        return this;
      };
      NonRecordingSpan2.prototype.addLinks = function(_links) {
        return this;
      };
      NonRecordingSpan2.prototype.setStatus = function(_status) {
        return this;
      };
      NonRecordingSpan2.prototype.updateName = function(_name) {
        return this;
      };
      NonRecordingSpan2.prototype.end = function(_endTime) {
      };
      NonRecordingSpan2.prototype.isRecording = function() {
        return false;
      };
      NonRecordingSpan2.prototype.recordException = function(_exception, _time) {
      };
      return NonRecordingSpan2;
    })()
  );

  // node_modules/@opentelemetry/api/build/esm/trace/context-utils.js
  var SPAN_KEY = createContextKey("OpenTelemetry Context Key SPAN");
  function getSpan(context2) {
    return context2.getValue(SPAN_KEY) || void 0;
  }
  function getActiveSpan() {
    return getSpan(ContextAPI.getInstance().active());
  }
  function setSpan(context2, span) {
    return context2.setValue(SPAN_KEY, span);
  }
  function deleteSpan(context2) {
    return context2.deleteValue(SPAN_KEY);
  }
  function setSpanContext(context2, spanContext) {
    return setSpan(context2, new NonRecordingSpan(spanContext));
  }
  function getSpanContext(context2) {
    var _a;
    return (_a = getSpan(context2)) === null || _a === void 0 ? void 0 : _a.spanContext();
  }

  // node_modules/@opentelemetry/api/build/esm/trace/spancontext-utils.js
  var VALID_TRACEID_REGEX = /^([0-9a-f]{32})$/i;
  var VALID_SPANID_REGEX = /^[0-9a-f]{16}$/i;
  function isValidTraceId(traceId) {
    return VALID_TRACEID_REGEX.test(traceId) && traceId !== INVALID_TRACEID;
  }
  function isValidSpanId(spanId) {
    return VALID_SPANID_REGEX.test(spanId) && spanId !== INVALID_SPANID;
  }
  function isSpanContextValid(spanContext) {
    return isValidTraceId(spanContext.traceId) && isValidSpanId(spanContext.spanId);
  }
  function wrapSpanContext(spanContext) {
    return new NonRecordingSpan(spanContext);
  }

  // node_modules/@opentelemetry/api/build/esm/trace/NoopTracer.js
  var contextApi = ContextAPI.getInstance();
  var NoopTracer = (
    /** @class */
    (function() {
      function NoopTracer2() {
      }
      NoopTracer2.prototype.startSpan = function(name, options, context2) {
        if (context2 === void 0) {
          context2 = contextApi.active();
        }
        var root = Boolean(options === null || options === void 0 ? void 0 : options.root);
        if (root) {
          return new NonRecordingSpan();
        }
        var parentFromContext = context2 && getSpanContext(context2);
        if (isSpanContext(parentFromContext) && isSpanContextValid(parentFromContext)) {
          return new NonRecordingSpan(parentFromContext);
        } else {
          return new NonRecordingSpan();
        }
      };
      NoopTracer2.prototype.startActiveSpan = function(name, arg2, arg3, arg4) {
        var opts;
        var ctx;
        var fn;
        if (arguments.length < 2) {
          return;
        } else if (arguments.length === 2) {
          fn = arg2;
        } else if (arguments.length === 3) {
          opts = arg2;
          fn = arg3;
        } else {
          opts = arg2;
          ctx = arg3;
          fn = arg4;
        }
        var parentContext = ctx !== null && ctx !== void 0 ? ctx : contextApi.active();
        var span = this.startSpan(name, opts, parentContext);
        var contextWithSpanSet = setSpan(parentContext, span);
        return contextApi.with(contextWithSpanSet, fn, void 0, span);
      };
      return NoopTracer2;
    })()
  );
  function isSpanContext(spanContext) {
    return typeof spanContext === "object" && typeof spanContext["spanId"] === "string" && typeof spanContext["traceId"] === "string" && typeof spanContext["traceFlags"] === "number";
  }

  // node_modules/@opentelemetry/api/build/esm/trace/ProxyTracer.js
  var NOOP_TRACER = new NoopTracer();
  var ProxyTracer = (
    /** @class */
    (function() {
      function ProxyTracer2(_provider, name, version, options) {
        this._provider = _provider;
        this.name = name;
        this.version = version;
        this.options = options;
      }
      ProxyTracer2.prototype.startSpan = function(name, options, context2) {
        return this._getTracer().startSpan(name, options, context2);
      };
      ProxyTracer2.prototype.startActiveSpan = function(_name, _options, _context, _fn) {
        var tracer = this._getTracer();
        return Reflect.apply(tracer.startActiveSpan, tracer, arguments);
      };
      ProxyTracer2.prototype._getTracer = function() {
        if (this._delegate) {
          return this._delegate;
        }
        var tracer = this._provider.getDelegateTracer(this.name, this.version, this.options);
        if (!tracer) {
          return NOOP_TRACER;
        }
        this._delegate = tracer;
        return this._delegate;
      };
      return ProxyTracer2;
    })()
  );

  // node_modules/@opentelemetry/api/build/esm/trace/NoopTracerProvider.js
  var NoopTracerProvider = (
    /** @class */
    (function() {
      function NoopTracerProvider2() {
      }
      NoopTracerProvider2.prototype.getTracer = function(_name, _version, _options) {
        return new NoopTracer();
      };
      return NoopTracerProvider2;
    })()
  );

  // node_modules/@opentelemetry/api/build/esm/trace/ProxyTracerProvider.js
  var NOOP_TRACER_PROVIDER = new NoopTracerProvider();
  var ProxyTracerProvider = (
    /** @class */
    (function() {
      function ProxyTracerProvider2() {
      }
      ProxyTracerProvider2.prototype.getTracer = function(name, version, options) {
        var _a;
        return (_a = this.getDelegateTracer(name, version, options)) !== null && _a !== void 0 ? _a : new ProxyTracer(this, name, version, options);
      };
      ProxyTracerProvider2.prototype.getDelegate = function() {
        var _a;
        return (_a = this._delegate) !== null && _a !== void 0 ? _a : NOOP_TRACER_PROVIDER;
      };
      ProxyTracerProvider2.prototype.setDelegate = function(delegate) {
        this._delegate = delegate;
      };
      ProxyTracerProvider2.prototype.getDelegateTracer = function(name, version, options) {
        var _a;
        return (_a = this._delegate) === null || _a === void 0 ? void 0 : _a.getTracer(name, version, options);
      };
      return ProxyTracerProvider2;
    })()
  );

  // node_modules/@opentelemetry/api/build/esm/trace/SamplingResult.js
  var SamplingDecision;
  (function(SamplingDecision3) {
    SamplingDecision3[SamplingDecision3["NOT_RECORD"] = 0] = "NOT_RECORD";
    SamplingDecision3[SamplingDecision3["RECORD"] = 1] = "RECORD";
    SamplingDecision3[SamplingDecision3["RECORD_AND_SAMPLED"] = 2] = "RECORD_AND_SAMPLED";
  })(SamplingDecision || (SamplingDecision = {}));

  // node_modules/@opentelemetry/api/build/esm/trace/span_kind.js
  var SpanKind;
  (function(SpanKind2) {
    SpanKind2[SpanKind2["INTERNAL"] = 0] = "INTERNAL";
    SpanKind2[SpanKind2["SERVER"] = 1] = "SERVER";
    SpanKind2[SpanKind2["CLIENT"] = 2] = "CLIENT";
    SpanKind2[SpanKind2["PRODUCER"] = 3] = "PRODUCER";
    SpanKind2[SpanKind2["CONSUMER"] = 4] = "CONSUMER";
  })(SpanKind || (SpanKind = {}));

  // node_modules/@opentelemetry/api/build/esm/trace/status.js
  var SpanStatusCode;
  (function(SpanStatusCode2) {
    SpanStatusCode2[SpanStatusCode2["UNSET"] = 0] = "UNSET";
    SpanStatusCode2[SpanStatusCode2["OK"] = 1] = "OK";
    SpanStatusCode2[SpanStatusCode2["ERROR"] = 2] = "ERROR";
  })(SpanStatusCode || (SpanStatusCode = {}));

  // node_modules/@opentelemetry/api/build/esm/context-api.js
  var context = ContextAPI.getInstance();

  // node_modules/@opentelemetry/api/build/esm/diag-api.js
  var diag2 = DiagAPI.instance();

  // node_modules/@opentelemetry/api/build/esm/metrics/NoopMeterProvider.js
  var NoopMeterProvider = (
    /** @class */
    (function() {
      function NoopMeterProvider2() {
      }
      NoopMeterProvider2.prototype.getMeter = function(_name, _version, _options) {
        return NOOP_METER;
      };
      return NoopMeterProvider2;
    })()
  );
  var NOOP_METER_PROVIDER = new NoopMeterProvider();

  // node_modules/@opentelemetry/api/build/esm/api/metrics.js
  var API_NAME3 = "metrics";
  var MetricsAPI = (
    /** @class */
    (function() {
      function MetricsAPI2() {
      }
      MetricsAPI2.getInstance = function() {
        if (!this._instance) {
          this._instance = new MetricsAPI2();
        }
        return this._instance;
      };
      MetricsAPI2.prototype.setGlobalMeterProvider = function(provider) {
        return registerGlobal(API_NAME3, provider, DiagAPI.instance());
      };
      MetricsAPI2.prototype.getMeterProvider = function() {
        return getGlobal(API_NAME3) || NOOP_METER_PROVIDER;
      };
      MetricsAPI2.prototype.getMeter = function(name, version, options) {
        return this.getMeterProvider().getMeter(name, version, options);
      };
      MetricsAPI2.prototype.disable = function() {
        unregisterGlobal(API_NAME3, DiagAPI.instance());
      };
      return MetricsAPI2;
    })()
  );

  // node_modules/@opentelemetry/api/build/esm/metrics-api.js
  var metrics = MetricsAPI.getInstance();

  // node_modules/@opentelemetry/api/build/esm/propagation/NoopTextMapPropagator.js
  var NoopTextMapPropagator = (
    /** @class */
    (function() {
      function NoopTextMapPropagator2() {
      }
      NoopTextMapPropagator2.prototype.inject = function(_context, _carrier) {
      };
      NoopTextMapPropagator2.prototype.extract = function(context2, _carrier) {
        return context2;
      };
      NoopTextMapPropagator2.prototype.fields = function() {
        return [];
      };
      return NoopTextMapPropagator2;
    })()
  );

  // node_modules/@opentelemetry/api/build/esm/baggage/context-helpers.js
  var BAGGAGE_KEY = createContextKey("OpenTelemetry Baggage Key");
  function getBaggage(context2) {
    return context2.getValue(BAGGAGE_KEY) || void 0;
  }
  function getActiveBaggage() {
    return getBaggage(ContextAPI.getInstance().active());
  }
  function setBaggage(context2, baggage) {
    return context2.setValue(BAGGAGE_KEY, baggage);
  }
  function deleteBaggage(context2) {
    return context2.deleteValue(BAGGAGE_KEY);
  }

  // node_modules/@opentelemetry/api/build/esm/api/propagation.js
  var API_NAME4 = "propagation";
  var NOOP_TEXT_MAP_PROPAGATOR = new NoopTextMapPropagator();
  var PropagationAPI = (
    /** @class */
    (function() {
      function PropagationAPI2() {
        this.createBaggage = createBaggage;
        this.getBaggage = getBaggage;
        this.getActiveBaggage = getActiveBaggage;
        this.setBaggage = setBaggage;
        this.deleteBaggage = deleteBaggage;
      }
      PropagationAPI2.getInstance = function() {
        if (!this._instance) {
          this._instance = new PropagationAPI2();
        }
        return this._instance;
      };
      PropagationAPI2.prototype.setGlobalPropagator = function(propagator) {
        return registerGlobal(API_NAME4, propagator, DiagAPI.instance());
      };
      PropagationAPI2.prototype.inject = function(context2, carrier, setter) {
        if (setter === void 0) {
          setter = defaultTextMapSetter;
        }
        return this._getGlobalPropagator().inject(context2, carrier, setter);
      };
      PropagationAPI2.prototype.extract = function(context2, carrier, getter) {
        if (getter === void 0) {
          getter = defaultTextMapGetter;
        }
        return this._getGlobalPropagator().extract(context2, carrier, getter);
      };
      PropagationAPI2.prototype.fields = function() {
        return this._getGlobalPropagator().fields();
      };
      PropagationAPI2.prototype.disable = function() {
        unregisterGlobal(API_NAME4, DiagAPI.instance());
      };
      PropagationAPI2.prototype._getGlobalPropagator = function() {
        return getGlobal(API_NAME4) || NOOP_TEXT_MAP_PROPAGATOR;
      };
      return PropagationAPI2;
    })()
  );

  // node_modules/@opentelemetry/api/build/esm/propagation-api.js
  var propagation = PropagationAPI.getInstance();

  // node_modules/@opentelemetry/api/build/esm/api/trace.js
  var API_NAME5 = "trace";
  var TraceAPI = (
    /** @class */
    (function() {
      function TraceAPI2() {
        this._proxyTracerProvider = new ProxyTracerProvider();
        this.wrapSpanContext = wrapSpanContext;
        this.isSpanContextValid = isSpanContextValid;
        this.deleteSpan = deleteSpan;
        this.getSpan = getSpan;
        this.getActiveSpan = getActiveSpan;
        this.getSpanContext = getSpanContext;
        this.setSpan = setSpan;
        this.setSpanContext = setSpanContext;
      }
      TraceAPI2.getInstance = function() {
        if (!this._instance) {
          this._instance = new TraceAPI2();
        }
        return this._instance;
      };
      TraceAPI2.prototype.setGlobalTracerProvider = function(provider) {
        var success = registerGlobal(API_NAME5, this._proxyTracerProvider, DiagAPI.instance());
        if (success) {
          this._proxyTracerProvider.setDelegate(provider);
        }
        return success;
      };
      TraceAPI2.prototype.getTracerProvider = function() {
        return getGlobal(API_NAME5) || this._proxyTracerProvider;
      };
      TraceAPI2.prototype.getTracer = function(name, version) {
        return this.getTracerProvider().getTracer(name, version);
      };
      TraceAPI2.prototype.disable = function() {
        unregisterGlobal(API_NAME5, DiagAPI.instance());
        this._proxyTracerProvider = new ProxyTracerProvider();
      };
      return TraceAPI2;
    })()
  );

  // node_modules/@opentelemetry/api/build/esm/trace-api.js
  var trace = TraceAPI.getInstance();

  // node_modules/@opentelemetry/api-logs/build/esm/types/LogRecord.js
  var SeverityNumber;
  (function(SeverityNumber2) {
    SeverityNumber2[SeverityNumber2["UNSPECIFIED"] = 0] = "UNSPECIFIED";
    SeverityNumber2[SeverityNumber2["TRACE"] = 1] = "TRACE";
    SeverityNumber2[SeverityNumber2["TRACE2"] = 2] = "TRACE2";
    SeverityNumber2[SeverityNumber2["TRACE3"] = 3] = "TRACE3";
    SeverityNumber2[SeverityNumber2["TRACE4"] = 4] = "TRACE4";
    SeverityNumber2[SeverityNumber2["DEBUG"] = 5] = "DEBUG";
    SeverityNumber2[SeverityNumber2["DEBUG2"] = 6] = "DEBUG2";
    SeverityNumber2[SeverityNumber2["DEBUG3"] = 7] = "DEBUG3";
    SeverityNumber2[SeverityNumber2["DEBUG4"] = 8] = "DEBUG4";
    SeverityNumber2[SeverityNumber2["INFO"] = 9] = "INFO";
    SeverityNumber2[SeverityNumber2["INFO2"] = 10] = "INFO2";
    SeverityNumber2[SeverityNumber2["INFO3"] = 11] = "INFO3";
    SeverityNumber2[SeverityNumber2["INFO4"] = 12] = "INFO4";
    SeverityNumber2[SeverityNumber2["WARN"] = 13] = "WARN";
    SeverityNumber2[SeverityNumber2["WARN2"] = 14] = "WARN2";
    SeverityNumber2[SeverityNumber2["WARN3"] = 15] = "WARN3";
    SeverityNumber2[SeverityNumber2["WARN4"] = 16] = "WARN4";
    SeverityNumber2[SeverityNumber2["ERROR"] = 17] = "ERROR";
    SeverityNumber2[SeverityNumber2["ERROR2"] = 18] = "ERROR2";
    SeverityNumber2[SeverityNumber2["ERROR3"] = 19] = "ERROR3";
    SeverityNumber2[SeverityNumber2["ERROR4"] = 20] = "ERROR4";
    SeverityNumber2[SeverityNumber2["FATAL"] = 21] = "FATAL";
    SeverityNumber2[SeverityNumber2["FATAL2"] = 22] = "FATAL2";
    SeverityNumber2[SeverityNumber2["FATAL3"] = 23] = "FATAL3";
    SeverityNumber2[SeverityNumber2["FATAL4"] = 24] = "FATAL4";
  })(SeverityNumber || (SeverityNumber = {}));

  // node_modules/@opentelemetry/api-logs/build/esm/NoopLogger.js
  var NoopLogger = class {
    emit(_logRecord) {
    }
  };
  var NOOP_LOGGER = new NoopLogger();

  // node_modules/@opentelemetry/api-logs/build/esm/NoopLoggerProvider.js
  var NoopLoggerProvider = class {
    getLogger(_name, _version, _options) {
      return new NoopLogger();
    }
  };
  var NOOP_LOGGER_PROVIDER = new NoopLoggerProvider();

  // node_modules/@opentelemetry/api-logs/build/esm/ProxyLogger.js
  var ProxyLogger = class {
    constructor(_provider, name, version, options) {
      this._provider = _provider;
      this.name = name;
      this.version = version;
      this.options = options;
    }
    /**
     * Emit a log record. This method should only be used by log appenders.
     *
     * @param logRecord
     */
    emit(logRecord) {
      this._getLogger().emit(logRecord);
    }
    /**
     * Try to get a logger from the proxy logger provider.
     * If the proxy logger provider has no delegate, return a noop logger.
     */
    _getLogger() {
      if (this._delegate) {
        return this._delegate;
      }
      const logger2 = this._provider._getDelegateLogger(this.name, this.version, this.options);
      if (!logger2) {
        return NOOP_LOGGER;
      }
      this._delegate = logger2;
      return this._delegate;
    }
  };

  // node_modules/@opentelemetry/api-logs/build/esm/ProxyLoggerProvider.js
  var ProxyLoggerProvider = class {
    getLogger(name, version, options) {
      var _a;
      return (_a = this._getDelegateLogger(name, version, options)) !== null && _a !== void 0 ? _a : new ProxyLogger(this, name, version, options);
    }
    /**
     * Get the delegate logger provider.
     * Used by tests only.
     * @internal
     */
    _getDelegate() {
      var _a;
      return (_a = this._delegate) !== null && _a !== void 0 ? _a : NOOP_LOGGER_PROVIDER;
    }
    /**
     * Set the delegate logger provider
     * @internal
     */
    _setDelegate(delegate) {
      this._delegate = delegate;
    }
    /**
     * @internal
     */
    _getDelegateLogger(name, version, options) {
      var _a;
      return (_a = this._delegate) === null || _a === void 0 ? void 0 : _a.getLogger(name, version, options);
    }
  };

  // node_modules/@opentelemetry/api-logs/build/esm/platform/browser/globalThis.js
  var _globalThis2 = typeof globalThis === "object" ? globalThis : typeof self === "object" ? self : typeof window === "object" ? window : typeof global === "object" ? global : {};

  // node_modules/@opentelemetry/api-logs/build/esm/internal/global-utils.js
  var GLOBAL_LOGS_API_KEY = /* @__PURE__ */ Symbol.for("io.opentelemetry.js.api.logs");
  var _global2 = _globalThis2;
  function makeGetter(requiredVersion, instance, fallback) {
    return (version) => version === requiredVersion ? instance : fallback;
  }
  var API_BACKWARDS_COMPATIBILITY_VERSION = 1;

  // node_modules/@opentelemetry/api-logs/build/esm/api/logs.js
  var LogsAPI = class _LogsAPI {
    constructor() {
      this._proxyLoggerProvider = new ProxyLoggerProvider();
    }
    static getInstance() {
      if (!this._instance) {
        this._instance = new _LogsAPI();
      }
      return this._instance;
    }
    setGlobalLoggerProvider(provider) {
      if (_global2[GLOBAL_LOGS_API_KEY]) {
        return this.getLoggerProvider();
      }
      _global2[GLOBAL_LOGS_API_KEY] = makeGetter(API_BACKWARDS_COMPATIBILITY_VERSION, provider, NOOP_LOGGER_PROVIDER);
      this._proxyLoggerProvider._setDelegate(provider);
      return provider;
    }
    /**
     * Returns the global logger provider.
     *
     * @returns LoggerProvider
     */
    getLoggerProvider() {
      var _a, _b;
      return (_b = (_a = _global2[GLOBAL_LOGS_API_KEY]) === null || _a === void 0 ? void 0 : _a.call(_global2, API_BACKWARDS_COMPATIBILITY_VERSION)) !== null && _b !== void 0 ? _b : this._proxyLoggerProvider;
    }
    /**
     * Returns a logger from the global logger provider.
     *
     * @returns Logger
     */
    getLogger(name, version, options) {
      return this.getLoggerProvider().getLogger(name, version, options);
    }
    /** Remove the global logger provider */
    disable() {
      delete _global2[GLOBAL_LOGS_API_KEY];
      this._proxyLoggerProvider = new ProxyLoggerProvider();
    }
  };

  // node_modules/@opentelemetry/api-logs/build/esm/index.js
  var logs = LogsAPI.getInstance();

  // node_modules/@opentelemetry/otlp-exporter-base/build/esm/OTLPExporterBase.js
  var OTLPExporterBase = class {
    _delegate;
    constructor(_delegate) {
      this._delegate = _delegate;
    }
    /**
     * Export items.
     * @param items
     * @param resultCallback
     */
    export(items, resultCallback) {
      this._delegate.export(items, resultCallback);
    }
    forceFlush() {
      return this._delegate.forceFlush();
    }
    shutdown() {
      return this._delegate.shutdown();
    }
  };

  // node_modules/@opentelemetry/otlp-exporter-base/build/esm/types.js
  var OTLPExporterError = class extends Error {
    code;
    name = "OTLPExporterError";
    data;
    constructor(message, code, data) {
      super(message);
      this.data = data;
      this.code = code;
    }
  };

  // node_modules/@opentelemetry/otlp-exporter-base/build/esm/configuration/shared-configuration.js
  function validateTimeoutMillis(timeoutMillis) {
    if (Number.isFinite(timeoutMillis) && timeoutMillis > 0) {
      return timeoutMillis;
    }
    throw new Error(`Configuration: timeoutMillis is invalid, expected number greater than 0 (actual: '${timeoutMillis}')`);
  }
  function wrapStaticHeadersInFunction(headers) {
    if (headers == null) {
      return void 0;
    }
    return async () => headers;
  }
  function mergeOtlpSharedConfigurationWithDefaults(userProvidedConfiguration, fallbackConfiguration, defaultConfiguration) {
    return {
      timeoutMillis: validateTimeoutMillis(userProvidedConfiguration.timeoutMillis ?? fallbackConfiguration.timeoutMillis ?? defaultConfiguration.timeoutMillis),
      concurrencyLimit: userProvidedConfiguration.concurrencyLimit ?? fallbackConfiguration.concurrencyLimit ?? defaultConfiguration.concurrencyLimit,
      compression: userProvidedConfiguration.compression ?? fallbackConfiguration.compression ?? defaultConfiguration.compression
    };
  }
  function getSharedConfigurationDefaults() {
    return {
      timeoutMillis: 1e4,
      concurrencyLimit: 30,
      compression: "none"
    };
  }

  // node_modules/@opentelemetry/otlp-exporter-base/build/esm/bounded-queue-export-promise-handler.js
  var BoundedQueueExportPromiseHandler = class {
    _concurrencyLimit;
    _sendingPromises = [];
    /**
     * @param concurrencyLimit maximum promises allowed in a queue at the same time.
     */
    constructor(concurrencyLimit) {
      this._concurrencyLimit = concurrencyLimit;
    }
    pushPromise(promise) {
      if (this.hasReachedLimit()) {
        throw new Error("Concurrency Limit reached");
      }
      this._sendingPromises.push(promise);
      const popPromise = () => {
        const index = this._sendingPromises.indexOf(promise);
        void this._sendingPromises.splice(index, 1);
      };
      promise.then(popPromise, popPromise);
    }
    hasReachedLimit() {
      return this._sendingPromises.length >= this._concurrencyLimit;
    }
    async awaitAll() {
      await Promise.all(this._sendingPromises);
    }
  };
  function createBoundedQueueExportPromiseHandler(options) {
    return new BoundedQueueExportPromiseHandler(options.concurrencyLimit);
  }

  // node_modules/@opentelemetry/core/build/esm/trace/suppress-tracing.js
  var SUPPRESS_TRACING_KEY = createContextKey("OpenTelemetry SDK Context Key SUPPRESS_TRACING");
  function suppressTracing(context2) {
    return context2.setValue(SUPPRESS_TRACING_KEY, true);
  }
  function isTracingSuppressed(context2) {
    return context2.getValue(SUPPRESS_TRACING_KEY) === true;
  }

  // node_modules/@opentelemetry/core/build/esm/baggage/constants.js
  var BAGGAGE_KEY_PAIR_SEPARATOR = "=";
  var BAGGAGE_PROPERTIES_SEPARATOR = ";";
  var BAGGAGE_ITEMS_SEPARATOR = ",";
  var BAGGAGE_HEADER = "baggage";
  var BAGGAGE_MAX_NAME_VALUE_PAIRS = 180;
  var BAGGAGE_MAX_PER_NAME_VALUE_PAIRS = 4096;
  var BAGGAGE_MAX_TOTAL_LENGTH = 8192;

  // node_modules/@opentelemetry/core/build/esm/baggage/utils.js
  function serializeKeyPairs(keyPairs) {
    return keyPairs.reduce((hValue, current) => {
      const value = `${hValue}${hValue !== "" ? BAGGAGE_ITEMS_SEPARATOR : ""}${current}`;
      return value.length > BAGGAGE_MAX_TOTAL_LENGTH ? hValue : value;
    }, "");
  }
  function getKeyPairs(baggage) {
    return baggage.getAllEntries().map(([key, value]) => {
      let entry = `${encodeURIComponent(key)}=${encodeURIComponent(value.value)}`;
      if (value.metadata !== void 0) {
        entry += BAGGAGE_PROPERTIES_SEPARATOR + value.metadata.toString();
      }
      return entry;
    });
  }
  function parsePairKeyValue(entry) {
    const valueProps = entry.split(BAGGAGE_PROPERTIES_SEPARATOR);
    if (valueProps.length <= 0)
      return;
    const keyPairPart = valueProps.shift();
    if (!keyPairPart)
      return;
    const separatorIndex = keyPairPart.indexOf(BAGGAGE_KEY_PAIR_SEPARATOR);
    if (separatorIndex <= 0)
      return;
    const key = decodeURIComponent(keyPairPart.substring(0, separatorIndex).trim());
    const value = decodeURIComponent(keyPairPart.substring(separatorIndex + 1).trim());
    let metadata;
    if (valueProps.length > 0) {
      metadata = baggageEntryMetadataFromString(valueProps.join(BAGGAGE_PROPERTIES_SEPARATOR));
    }
    return { key, value, metadata };
  }

  // node_modules/@opentelemetry/core/build/esm/baggage/propagation/W3CBaggagePropagator.js
  var W3CBaggagePropagator = class {
    inject(context2, carrier, setter) {
      const baggage = propagation.getBaggage(context2);
      if (!baggage || isTracingSuppressed(context2))
        return;
      const keyPairs = getKeyPairs(baggage).filter((pair) => {
        return pair.length <= BAGGAGE_MAX_PER_NAME_VALUE_PAIRS;
      }).slice(0, BAGGAGE_MAX_NAME_VALUE_PAIRS);
      const headerValue = serializeKeyPairs(keyPairs);
      if (headerValue.length > 0) {
        setter.set(carrier, BAGGAGE_HEADER, headerValue);
      }
    }
    extract(context2, carrier, getter) {
      const headerValue = getter.get(carrier, BAGGAGE_HEADER);
      const baggageString = Array.isArray(headerValue) ? headerValue.join(BAGGAGE_ITEMS_SEPARATOR) : headerValue;
      if (!baggageString)
        return context2;
      const baggage = {};
      if (baggageString.length === 0) {
        return context2;
      }
      const pairs = baggageString.split(BAGGAGE_ITEMS_SEPARATOR);
      pairs.forEach((entry) => {
        const keyPair = parsePairKeyValue(entry);
        if (keyPair) {
          const baggageEntry = { value: keyPair.value };
          if (keyPair.metadata) {
            baggageEntry.metadata = keyPair.metadata;
          }
          baggage[keyPair.key] = baggageEntry;
        }
      });
      if (Object.entries(baggage).length === 0) {
        return context2;
      }
      return propagation.setBaggage(context2, propagation.createBaggage(baggage));
    }
    fields() {
      return [BAGGAGE_HEADER];
    }
  };

  // node_modules/@opentelemetry/core/build/esm/common/attributes.js
  function sanitizeAttributes(attributes) {
    const out = {};
    if (typeof attributes !== "object" || attributes == null) {
      return out;
    }
    for (const key in attributes) {
      if (!Object.prototype.hasOwnProperty.call(attributes, key)) {
        continue;
      }
      if (!isAttributeKey(key)) {
        diag2.warn(`Invalid attribute key: ${key}`);
        continue;
      }
      const val = attributes[key];
      if (!isAttributeValue(val)) {
        diag2.warn(`Invalid attribute value set for key: ${key}`);
        continue;
      }
      if (Array.isArray(val)) {
        out[key] = val.slice();
      } else {
        out[key] = val;
      }
    }
    return out;
  }
  function isAttributeKey(key) {
    return typeof key === "string" && key !== "";
  }
  function isAttributeValue(val) {
    if (val == null) {
      return true;
    }
    if (Array.isArray(val)) {
      return isHomogeneousAttributeValueArray(val);
    }
    return isValidPrimitiveAttributeValueType(typeof val);
  }
  function isHomogeneousAttributeValueArray(arr) {
    let type;
    for (const element of arr) {
      if (element == null)
        continue;
      const elementType = typeof element;
      if (elementType === type) {
        continue;
      }
      if (!type) {
        if (isValidPrimitiveAttributeValueType(elementType)) {
          type = elementType;
          continue;
        }
        return false;
      }
      return false;
    }
    return true;
  }
  function isValidPrimitiveAttributeValueType(valType) {
    switch (valType) {
      case "number":
      case "boolean":
      case "string":
        return true;
    }
    return false;
  }

  // node_modules/@opentelemetry/core/build/esm/common/logging-error-handler.js
  function loggingErrorHandler() {
    return (ex) => {
      diag2.error(stringifyException(ex));
    };
  }
  function stringifyException(ex) {
    if (typeof ex === "string") {
      return ex;
    } else {
      return JSON.stringify(flattenException(ex));
    }
  }
  function flattenException(ex) {
    const result = {};
    let current = ex;
    while (current !== null) {
      Object.getOwnPropertyNames(current).forEach((propertyName) => {
        if (result[propertyName])
          return;
        const value = current[propertyName];
        if (value) {
          result[propertyName] = String(value);
        }
      });
      current = Object.getPrototypeOf(current);
    }
    return result;
  }

  // node_modules/@opentelemetry/core/build/esm/common/global-error-handler.js
  var delegateHandler = loggingErrorHandler();
  function globalErrorHandler(ex) {
    try {
      delegateHandler(ex);
    } catch {
    }
  }

  // node_modules/@opentelemetry/core/build/esm/platform/browser/environment.js
  function getStringFromEnv(_) {
    return void 0;
  }
  function getNumberFromEnv(_) {
    return void 0;
  }
  function getStringListFromEnv(_) {
    return void 0;
  }

  // node_modules/@opentelemetry/core/build/esm/platform/browser/globalThis.js
  var _globalThis3 = typeof globalThis === "object" ? globalThis : typeof self === "object" ? self : typeof window === "object" ? window : typeof global === "object" ? global : {};

  // node_modules/@opentelemetry/core/build/esm/platform/browser/performance.js
  var otperformance = performance;

  // node_modules/@opentelemetry/core/build/esm/version.js
  var VERSION2 = "2.2.0";

  // node_modules/@opentelemetry/semantic-conventions/build/esm/stable_attributes.js
  var ATTR_ERROR_TYPE = "error.type";
  var ATTR_EXCEPTION_MESSAGE = "exception.message";
  var ATTR_EXCEPTION_STACKTRACE = "exception.stacktrace";
  var ATTR_EXCEPTION_TYPE = "exception.type";
  var ATTR_HTTP_REQUEST_METHOD = "http.request.method";
  var ATTR_HTTP_REQUEST_METHOD_ORIGINAL = "http.request.method_original";
  var ATTR_HTTP_RESPONSE_STATUS_CODE = "http.response.status_code";
  var ATTR_SERVER_ADDRESS = "server.address";
  var ATTR_SERVER_PORT = "server.port";
  var ATTR_SERVICE_NAME = "service.name";
  var ATTR_TELEMETRY_SDK_LANGUAGE = "telemetry.sdk.language";
  var TELEMETRY_SDK_LANGUAGE_VALUE_WEBJS = "webjs";
  var ATTR_TELEMETRY_SDK_NAME = "telemetry.sdk.name";
  var ATTR_TELEMETRY_SDK_VERSION = "telemetry.sdk.version";
  var ATTR_URL_FULL = "url.full";
  var ATTR_USER_AGENT_ORIGINAL = "user_agent.original";

  // node_modules/@opentelemetry/core/build/esm/semconv.js
  var ATTR_PROCESS_RUNTIME_NAME = "process.runtime.name";

  // node_modules/@opentelemetry/core/build/esm/platform/browser/sdk-info.js
  var SDK_INFO = {
    [ATTR_TELEMETRY_SDK_NAME]: "opentelemetry",
    [ATTR_PROCESS_RUNTIME_NAME]: "browser",
    [ATTR_TELEMETRY_SDK_LANGUAGE]: TELEMETRY_SDK_LANGUAGE_VALUE_WEBJS,
    [ATTR_TELEMETRY_SDK_VERSION]: VERSION2
  };

  // node_modules/@opentelemetry/core/build/esm/common/time.js
  var NANOSECOND_DIGITS = 9;
  var NANOSECOND_DIGITS_IN_MILLIS = 6;
  var MILLISECONDS_TO_NANOSECONDS = Math.pow(10, NANOSECOND_DIGITS_IN_MILLIS);
  var SECOND_TO_NANOSECONDS = Math.pow(10, NANOSECOND_DIGITS);
  function millisToHrTime(epochMillis) {
    const epochSeconds = epochMillis / 1e3;
    const seconds = Math.trunc(epochSeconds);
    const nanos = Math.round(epochMillis % 1e3 * MILLISECONDS_TO_NANOSECONDS);
    return [seconds, nanos];
  }
  function getTimeOrigin() {
    let timeOrigin = otperformance.timeOrigin;
    if (typeof timeOrigin !== "number") {
      const perf = otperformance;
      timeOrigin = perf.timing && perf.timing.fetchStart;
    }
    return timeOrigin;
  }
  function hrTime(performanceNow) {
    const timeOrigin = millisToHrTime(getTimeOrigin());
    const now = millisToHrTime(typeof performanceNow === "number" ? performanceNow : otperformance.now());
    return addHrTimes(timeOrigin, now);
  }
  function timeInputToHrTime(time) {
    if (isTimeInputHrTime(time)) {
      return time;
    } else if (typeof time === "number") {
      if (time < getTimeOrigin()) {
        return hrTime(time);
      } else {
        return millisToHrTime(time);
      }
    } else if (time instanceof Date) {
      return millisToHrTime(time.getTime());
    } else {
      throw TypeError("Invalid input type");
    }
  }
  function hrTimeDuration(startTime, endTime) {
    let seconds = endTime[0] - startTime[0];
    let nanos = endTime[1] - startTime[1];
    if (nanos < 0) {
      seconds -= 1;
      nanos += SECOND_TO_NANOSECONDS;
    }
    return [seconds, nanos];
  }
  function hrTimeToNanoseconds(time) {
    return time[0] * SECOND_TO_NANOSECONDS + time[1];
  }
  function hrTimeToMicroseconds(time) {
    return time[0] * 1e6 + time[1] / 1e3;
  }
  function isTimeInputHrTime(value) {
    return Array.isArray(value) && value.length === 2 && typeof value[0] === "number" && typeof value[1] === "number";
  }
  function isTimeInput(value) {
    return isTimeInputHrTime(value) || typeof value === "number" || value instanceof Date;
  }
  function addHrTimes(time1, time2) {
    const out = [time1[0] + time2[0], time1[1] + time2[1]];
    if (out[1] >= SECOND_TO_NANOSECONDS) {
      out[1] -= SECOND_TO_NANOSECONDS;
      out[0] += 1;
    }
    return out;
  }

  // node_modules/@opentelemetry/core/build/esm/ExportResult.js
  var ExportResultCode;
  (function(ExportResultCode2) {
    ExportResultCode2[ExportResultCode2["SUCCESS"] = 0] = "SUCCESS";
    ExportResultCode2[ExportResultCode2["FAILED"] = 1] = "FAILED";
  })(ExportResultCode || (ExportResultCode = {}));

  // node_modules/@opentelemetry/core/build/esm/propagation/composite.js
  var CompositePropagator = class {
    _propagators;
    _fields;
    /**
     * Construct a composite propagator from a list of propagators.
     *
     * @param [config] Configuration object for composite propagator
     */
    constructor(config = {}) {
      this._propagators = config.propagators ?? [];
      this._fields = Array.from(new Set(this._propagators.map((p) => typeof p.fields === "function" ? p.fields() : []).reduce((x, y) => x.concat(y), [])));
    }
    /**
     * Run each of the configured propagators with the given context and carrier.
     * Propagators are run in the order they are configured, so if multiple
     * propagators write the same carrier key, the propagator later in the list
     * will "win".
     *
     * @param context Context to inject
     * @param carrier Carrier into which context will be injected
     */
    inject(context2, carrier, setter) {
      for (const propagator of this._propagators) {
        try {
          propagator.inject(context2, carrier, setter);
        } catch (err) {
          diag2.warn(`Failed to inject with ${propagator.constructor.name}. Err: ${err.message}`);
        }
      }
    }
    /**
     * Run each of the configured propagators with the given context and carrier.
     * Propagators are run in the order they are configured, so if multiple
     * propagators write the same context key, the propagator later in the list
     * will "win".
     *
     * @param context Context to add values to
     * @param carrier Carrier from which to extract context
     */
    extract(context2, carrier, getter) {
      return this._propagators.reduce((ctx, propagator) => {
        try {
          return propagator.extract(ctx, carrier, getter);
        } catch (err) {
          diag2.warn(`Failed to extract with ${propagator.constructor.name}. Err: ${err.message}`);
        }
        return ctx;
      }, context2);
    }
    fields() {
      return this._fields.slice();
    }
  };

  // node_modules/@opentelemetry/core/build/esm/internal/validators.js
  var VALID_KEY_CHAR_RANGE = "[_0-9a-z-*/]";
  var VALID_KEY = `[a-z]${VALID_KEY_CHAR_RANGE}{0,255}`;
  var VALID_VENDOR_KEY = `[a-z0-9]${VALID_KEY_CHAR_RANGE}{0,240}@[a-z]${VALID_KEY_CHAR_RANGE}{0,13}`;
  var VALID_KEY_REGEX = new RegExp(`^(?:${VALID_KEY}|${VALID_VENDOR_KEY})$`);
  var VALID_VALUE_BASE_REGEX = /^[ -~]{0,255}[!-~]$/;
  var INVALID_VALUE_COMMA_EQUAL_REGEX = /,|=/;
  function validateKey(key) {
    return VALID_KEY_REGEX.test(key);
  }
  function validateValue(value) {
    return VALID_VALUE_BASE_REGEX.test(value) && !INVALID_VALUE_COMMA_EQUAL_REGEX.test(value);
  }

  // node_modules/@opentelemetry/core/build/esm/trace/TraceState.js
  var MAX_TRACE_STATE_ITEMS = 32;
  var MAX_TRACE_STATE_LEN = 512;
  var LIST_MEMBERS_SEPARATOR = ",";
  var LIST_MEMBER_KEY_VALUE_SPLITTER = "=";
  var TraceState = class _TraceState {
    _internalState = /* @__PURE__ */ new Map();
    constructor(rawTraceState) {
      if (rawTraceState)
        this._parse(rawTraceState);
    }
    set(key, value) {
      const traceState = this._clone();
      if (traceState._internalState.has(key)) {
        traceState._internalState.delete(key);
      }
      traceState._internalState.set(key, value);
      return traceState;
    }
    unset(key) {
      const traceState = this._clone();
      traceState._internalState.delete(key);
      return traceState;
    }
    get(key) {
      return this._internalState.get(key);
    }
    serialize() {
      return this._keys().reduce((agg, key) => {
        agg.push(key + LIST_MEMBER_KEY_VALUE_SPLITTER + this.get(key));
        return agg;
      }, []).join(LIST_MEMBERS_SEPARATOR);
    }
    _parse(rawTraceState) {
      if (rawTraceState.length > MAX_TRACE_STATE_LEN)
        return;
      this._internalState = rawTraceState.split(LIST_MEMBERS_SEPARATOR).reverse().reduce((agg, part) => {
        const listMember = part.trim();
        const i = listMember.indexOf(LIST_MEMBER_KEY_VALUE_SPLITTER);
        if (i !== -1) {
          const key = listMember.slice(0, i);
          const value = listMember.slice(i + 1, part.length);
          if (validateKey(key) && validateValue(value)) {
            agg.set(key, value);
          } else {
          }
        }
        return agg;
      }, /* @__PURE__ */ new Map());
      if (this._internalState.size > MAX_TRACE_STATE_ITEMS) {
        this._internalState = new Map(Array.from(this._internalState.entries()).reverse().slice(0, MAX_TRACE_STATE_ITEMS));
      }
    }
    _keys() {
      return Array.from(this._internalState.keys()).reverse();
    }
    _clone() {
      const traceState = new _TraceState();
      traceState._internalState = new Map(this._internalState);
      return traceState;
    }
  };

  // node_modules/@opentelemetry/core/build/esm/trace/W3CTraceContextPropagator.js
  var TRACE_PARENT_HEADER = "traceparent";
  var TRACE_STATE_HEADER = "tracestate";
  var VERSION3 = "00";
  var VERSION_PART = "(?!ff)[\\da-f]{2}";
  var TRACE_ID_PART = "(?![0]{32})[\\da-f]{32}";
  var PARENT_ID_PART = "(?![0]{16})[\\da-f]{16}";
  var FLAGS_PART = "[\\da-f]{2}";
  var TRACE_PARENT_REGEX = new RegExp(`^\\s?(${VERSION_PART})-(${TRACE_ID_PART})-(${PARENT_ID_PART})-(${FLAGS_PART})(-.*)?\\s?$`);
  function parseTraceParent(traceParent) {
    const match = TRACE_PARENT_REGEX.exec(traceParent);
    if (!match)
      return null;
    if (match[1] === "00" && match[5])
      return null;
    return {
      traceId: match[2],
      spanId: match[3],
      traceFlags: parseInt(match[4], 16)
    };
  }
  var W3CTraceContextPropagator = class {
    inject(context2, carrier, setter) {
      const spanContext = trace.getSpanContext(context2);
      if (!spanContext || isTracingSuppressed(context2) || !isSpanContextValid(spanContext))
        return;
      const traceParent = `${VERSION3}-${spanContext.traceId}-${spanContext.spanId}-0${Number(spanContext.traceFlags || TraceFlags.NONE).toString(16)}`;
      setter.set(carrier, TRACE_PARENT_HEADER, traceParent);
      if (spanContext.traceState) {
        setter.set(carrier, TRACE_STATE_HEADER, spanContext.traceState.serialize());
      }
    }
    extract(context2, carrier, getter) {
      const traceParentHeader = getter.get(carrier, TRACE_PARENT_HEADER);
      if (!traceParentHeader)
        return context2;
      const traceParent = Array.isArray(traceParentHeader) ? traceParentHeader[0] : traceParentHeader;
      if (typeof traceParent !== "string")
        return context2;
      const spanContext = parseTraceParent(traceParent);
      if (!spanContext)
        return context2;
      spanContext.isRemote = true;
      const traceStateHeader = getter.get(carrier, TRACE_STATE_HEADER);
      if (traceStateHeader) {
        const state = Array.isArray(traceStateHeader) ? traceStateHeader.join(",") : traceStateHeader;
        spanContext.traceState = new TraceState(typeof state === "string" ? state : void 0);
      }
      return trace.setSpanContext(context2, spanContext);
    }
    fields() {
      return [TRACE_PARENT_HEADER, TRACE_STATE_HEADER];
    }
  };

  // node_modules/@opentelemetry/core/build/esm/utils/lodash.merge.js
  var objectTag = "[object Object]";
  var nullTag = "[object Null]";
  var undefinedTag = "[object Undefined]";
  var funcProto = Function.prototype;
  var funcToString = funcProto.toString;
  var objectCtorString = funcToString.call(Object);
  var getPrototypeOf = Object.getPrototypeOf;
  var objectProto = Object.prototype;
  var hasOwnProperty = objectProto.hasOwnProperty;
  var symToStringTag = Symbol ? Symbol.toStringTag : void 0;
  var nativeObjectToString = objectProto.toString;
  function isPlainObject(value) {
    if (!isObjectLike(value) || baseGetTag(value) !== objectTag) {
      return false;
    }
    const proto = getPrototypeOf(value);
    if (proto === null) {
      return true;
    }
    const Ctor = hasOwnProperty.call(proto, "constructor") && proto.constructor;
    return typeof Ctor == "function" && Ctor instanceof Ctor && funcToString.call(Ctor) === objectCtorString;
  }
  function isObjectLike(value) {
    return value != null && typeof value == "object";
  }
  function baseGetTag(value) {
    if (value == null) {
      return value === void 0 ? undefinedTag : nullTag;
    }
    return symToStringTag && symToStringTag in Object(value) ? getRawTag(value) : objectToString(value);
  }
  function getRawTag(value) {
    const isOwn = hasOwnProperty.call(value, symToStringTag), tag = value[symToStringTag];
    let unmasked = false;
    try {
      value[symToStringTag] = void 0;
      unmasked = true;
    } catch {
    }
    const result = nativeObjectToString.call(value);
    if (unmasked) {
      if (isOwn) {
        value[symToStringTag] = tag;
      } else {
        delete value[symToStringTag];
      }
    }
    return result;
  }
  function objectToString(value) {
    return nativeObjectToString.call(value);
  }

  // node_modules/@opentelemetry/core/build/esm/utils/merge.js
  var MAX_LEVEL = 20;
  function merge(...args) {
    let result = args.shift();
    const objects = /* @__PURE__ */ new WeakMap();
    while (args.length > 0) {
      result = mergeTwoObjects(result, args.shift(), 0, objects);
    }
    return result;
  }
  function takeValue(value) {
    if (isArray(value)) {
      return value.slice();
    }
    return value;
  }
  function mergeTwoObjects(one, two, level = 0, objects) {
    let result;
    if (level > MAX_LEVEL) {
      return void 0;
    }
    level++;
    if (isPrimitive(one) || isPrimitive(two) || isFunction(two)) {
      result = takeValue(two);
    } else if (isArray(one)) {
      result = one.slice();
      if (isArray(two)) {
        for (let i = 0, j = two.length; i < j; i++) {
          result.push(takeValue(two[i]));
        }
      } else if (isObject(two)) {
        const keys = Object.keys(two);
        for (let i = 0, j = keys.length; i < j; i++) {
          const key = keys[i];
          result[key] = takeValue(two[key]);
        }
      }
    } else if (isObject(one)) {
      if (isObject(two)) {
        if (!shouldMerge(one, two)) {
          return two;
        }
        result = Object.assign({}, one);
        const keys = Object.keys(two);
        for (let i = 0, j = keys.length; i < j; i++) {
          const key = keys[i];
          const twoValue = two[key];
          if (isPrimitive(twoValue)) {
            if (typeof twoValue === "undefined") {
              delete result[key];
            } else {
              result[key] = twoValue;
            }
          } else {
            const obj1 = result[key];
            const obj2 = twoValue;
            if (wasObjectReferenced(one, key, objects) || wasObjectReferenced(two, key, objects)) {
              delete result[key];
            } else {
              if (isObject(obj1) && isObject(obj2)) {
                const arr1 = objects.get(obj1) || [];
                const arr2 = objects.get(obj2) || [];
                arr1.push({ obj: one, key });
                arr2.push({ obj: two, key });
                objects.set(obj1, arr1);
                objects.set(obj2, arr2);
              }
              result[key] = mergeTwoObjects(result[key], twoValue, level, objects);
            }
          }
        }
      } else {
        result = two;
      }
    }
    return result;
  }
  function wasObjectReferenced(obj, key, objects) {
    const arr = objects.get(obj[key]) || [];
    for (let i = 0, j = arr.length; i < j; i++) {
      const info = arr[i];
      if (info.key === key && info.obj === obj) {
        return true;
      }
    }
    return false;
  }
  function isArray(value) {
    return Array.isArray(value);
  }
  function isFunction(value) {
    return typeof value === "function";
  }
  function isObject(value) {
    return !isPrimitive(value) && !isArray(value) && !isFunction(value) && typeof value === "object";
  }
  function isPrimitive(value) {
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean" || typeof value === "undefined" || value instanceof Date || value instanceof RegExp || value === null;
  }
  function shouldMerge(one, two) {
    if (!isPlainObject(one) || !isPlainObject(two)) {
      return false;
    }
    return true;
  }

  // node_modules/@opentelemetry/core/build/esm/utils/timeout.js
  var TimeoutError = class _TimeoutError extends Error {
    constructor(message) {
      super(message);
      Object.setPrototypeOf(this, _TimeoutError.prototype);
    }
  };
  function callWithTimeout(promise, timeout) {
    let timeoutHandle;
    const timeoutPromise = new Promise(function timeoutFunction(_resolve, reject) {
      timeoutHandle = setTimeout(function timeoutHandler() {
        reject(new TimeoutError("Operation timed out."));
      }, timeout);
    });
    return Promise.race([promise, timeoutPromise]).then((result) => {
      clearTimeout(timeoutHandle);
      return result;
    }, (reason) => {
      clearTimeout(timeoutHandle);
      throw reason;
    });
  }

  // node_modules/@opentelemetry/core/build/esm/utils/url.js
  function urlMatches(url, urlToMatch) {
    if (typeof urlToMatch === "string") {
      return url === urlToMatch;
    } else {
      return !!url.match(urlToMatch);
    }
  }
  function isUrlIgnored(url, ignoredUrls) {
    if (!ignoredUrls) {
      return false;
    }
    for (const ignoreUrl of ignoredUrls) {
      if (urlMatches(url, ignoreUrl)) {
        return true;
      }
    }
    return false;
  }

  // node_modules/@opentelemetry/core/build/esm/utils/promise.js
  var Deferred = class {
    _promise;
    _resolve;
    _reject;
    constructor() {
      this._promise = new Promise((resolve, reject) => {
        this._resolve = resolve;
        this._reject = reject;
      });
    }
    get promise() {
      return this._promise;
    }
    resolve(val) {
      this._resolve(val);
    }
    reject(err) {
      this._reject(err);
    }
  };

  // node_modules/@opentelemetry/core/build/esm/utils/callback.js
  var BindOnceFuture = class {
    _callback;
    _that;
    _isCalled = false;
    _deferred = new Deferred();
    constructor(_callback, _that) {
      this._callback = _callback;
      this._that = _that;
    }
    get isCalled() {
      return this._isCalled;
    }
    get promise() {
      return this._deferred.promise;
    }
    call(...args) {
      if (!this._isCalled) {
        this._isCalled = true;
        try {
          Promise.resolve(this._callback.call(this._that, ...args)).then((val) => this._deferred.resolve(val), (err) => this._deferred.reject(err));
        } catch (err) {
          this._deferred.reject(err);
        }
      }
      return this._deferred.promise;
    }
  };

  // node_modules/@opentelemetry/core/build/esm/internal/exporter.js
  function _export(exporter, arg) {
    return new Promise((resolve) => {
      context.with(suppressTracing(context.active()), () => {
        exporter.export(arg, (result) => {
          resolve(result);
        });
      });
    });
  }

  // node_modules/@opentelemetry/core/build/esm/index.js
  var internal = {
    _export
  };

  // node_modules/@opentelemetry/otlp-exporter-base/build/esm/logging-response-handler.js
  function isPartialSuccessResponse(response) {
    return Object.prototype.hasOwnProperty.call(response, "partialSuccess");
  }
  function createLoggingPartialSuccessResponseHandler() {
    return {
      handleResponse(response) {
        if (response == null || !isPartialSuccessResponse(response) || response.partialSuccess == null || Object.keys(response.partialSuccess).length === 0) {
          return;
        }
        diag2.warn("Received Partial Success response:", JSON.stringify(response.partialSuccess));
      }
    };
  }

  // node_modules/@opentelemetry/otlp-exporter-base/build/esm/otlp-export-delegate.js
  var OTLPExportDelegate = class {
    _transport;
    _serializer;
    _responseHandler;
    _promiseQueue;
    _timeout;
    _diagLogger;
    constructor(_transport, _serializer, _responseHandler, _promiseQueue, _timeout) {
      this._transport = _transport;
      this._serializer = _serializer;
      this._responseHandler = _responseHandler;
      this._promiseQueue = _promiseQueue;
      this._timeout = _timeout;
      this._diagLogger = diag2.createComponentLogger({
        namespace: "OTLPExportDelegate"
      });
    }
    export(internalRepresentation, resultCallback) {
      this._diagLogger.debug("items to be sent", internalRepresentation);
      if (this._promiseQueue.hasReachedLimit()) {
        resultCallback({
          code: ExportResultCode.FAILED,
          error: new Error("Concurrent export limit reached")
        });
        return;
      }
      const serializedRequest = this._serializer.serializeRequest(internalRepresentation);
      if (serializedRequest == null) {
        resultCallback({
          code: ExportResultCode.FAILED,
          error: new Error("Nothing to send")
        });
        return;
      }
      this._promiseQueue.pushPromise(this._transport.send(serializedRequest, this._timeout).then((response) => {
        if (response.status === "success") {
          if (response.data != null) {
            try {
              this._responseHandler.handleResponse(this._serializer.deserializeResponse(response.data));
            } catch (e) {
              this._diagLogger.warn("Export succeeded but could not deserialize response - is the response specification compliant?", e, response.data);
            }
          }
          resultCallback({
            code: ExportResultCode.SUCCESS
          });
          return;
        } else if (response.status === "failure" && response.error) {
          resultCallback({
            code: ExportResultCode.FAILED,
            error: response.error
          });
          return;
        } else if (response.status === "retryable") {
          resultCallback({
            code: ExportResultCode.FAILED,
            error: new OTLPExporterError("Export failed with retryable status")
          });
        } else {
          resultCallback({
            code: ExportResultCode.FAILED,
            error: new OTLPExporterError("Export failed with unknown error")
          });
        }
      }, (reason) => resultCallback({
        code: ExportResultCode.FAILED,
        error: reason
      })));
    }
    forceFlush() {
      return this._promiseQueue.awaitAll();
    }
    async shutdown() {
      this._diagLogger.debug("shutdown started");
      await this.forceFlush();
      this._transport.shutdown();
    }
  };
  function createOtlpExportDelegate(components, settings) {
    return new OTLPExportDelegate(components.transport, components.serializer, createLoggingPartialSuccessResponseHandler(), components.promiseHandler, settings.timeout);
  }

  // node_modules/@opentelemetry/otlp-exporter-base/build/esm/otlp-network-export-delegate.js
  function createOtlpNetworkExportDelegate(options, serializer, transport) {
    return createOtlpExportDelegate({
      transport,
      serializer,
      promiseHandler: createBoundedQueueExportPromiseHandler(options)
    }, { timeout: options.timeoutMillis });
  }

  // node_modules/@opentelemetry/otlp-transformer/build/esm/common/hex-to-binary.js
  function intValue(charCode) {
    if (charCode >= 48 && charCode <= 57) {
      return charCode - 48;
    }
    if (charCode >= 97 && charCode <= 102) {
      return charCode - 87;
    }
    return charCode - 55;
  }
  function hexToBinary(hexStr) {
    const buf = new Uint8Array(hexStr.length / 2);
    let offset = 0;
    for (let i = 0; i < hexStr.length; i += 2) {
      const hi = intValue(hexStr.charCodeAt(i));
      const lo = intValue(hexStr.charCodeAt(i + 1));
      buf[offset++] = hi << 4 | lo;
    }
    return buf;
  }

  // node_modules/@opentelemetry/otlp-transformer/build/esm/common/utils.js
  function hrTimeToNanos(hrTime3) {
    const NANOSECONDS = BigInt(1e9);
    return BigInt(Math.trunc(hrTime3[0])) * NANOSECONDS + BigInt(Math.trunc(hrTime3[1]));
  }
  function toLongBits(value) {
    const low = Number(BigInt.asUintN(32, value));
    const high = Number(BigInt.asUintN(32, value >> BigInt(32)));
    return { low, high };
  }
  function encodeAsLongBits(hrTime3) {
    const nanos = hrTimeToNanos(hrTime3);
    return toLongBits(nanos);
  }
  function encodeAsString(hrTime3) {
    const nanos = hrTimeToNanos(hrTime3);
    return nanos.toString();
  }
  var encodeTimestamp = typeof BigInt !== "undefined" ? encodeAsString : hrTimeToNanoseconds;
  function identity(value) {
    return value;
  }
  function optionalHexToBinary(str) {
    if (str === void 0)
      return void 0;
    return hexToBinary(str);
  }
  var DEFAULT_ENCODER = {
    encodeHrTime: encodeAsLongBits,
    encodeSpanContext: hexToBinary,
    encodeOptionalSpanContext: optionalHexToBinary
  };
  function getOtlpEncoder(options) {
    if (options === void 0) {
      return DEFAULT_ENCODER;
    }
    const useLongBits = options.useLongBits ?? true;
    const useHex = options.useHex ?? false;
    return {
      encodeHrTime: useLongBits ? encodeAsLongBits : encodeTimestamp,
      encodeSpanContext: useHex ? identity : hexToBinary,
      encodeOptionalSpanContext: useHex ? identity : optionalHexToBinary
    };
  }

  // node_modules/@opentelemetry/otlp-transformer/build/esm/common/internal.js
  function createResource(resource) {
    const result = {
      attributes: toAttributes(resource.attributes),
      droppedAttributesCount: 0
    };
    const schemaUrl = resource.schemaUrl;
    if (schemaUrl && schemaUrl !== "")
      result.schemaUrl = schemaUrl;
    return result;
  }
  function createInstrumentationScope(scope) {
    return {
      name: scope.name,
      version: scope.version
    };
  }
  function toAttributes(attributes) {
    return Object.keys(attributes).map((key) => toKeyValue(key, attributes[key]));
  }
  function toKeyValue(key, value) {
    return {
      key,
      value: toAnyValue(value)
    };
  }
  function toAnyValue(value) {
    const t = typeof value;
    if (t === "string")
      return { stringValue: value };
    if (t === "number") {
      if (!Number.isInteger(value))
        return { doubleValue: value };
      return { intValue: value };
    }
    if (t === "boolean")
      return { boolValue: value };
    if (value instanceof Uint8Array)
      return { bytesValue: value };
    if (Array.isArray(value))
      return { arrayValue: { values: value.map(toAnyValue) } };
    if (t === "object" && value != null)
      return {
        kvlistValue: {
          values: Object.entries(value).map(([k, v]) => toKeyValue(k, v))
        }
      };
    return {};
  }

  // node_modules/@opentelemetry/otlp-transformer/build/esm/logs/internal.js
  function createExportLogsServiceRequest(logRecords, options) {
    const encoder = getOtlpEncoder(options);
    return {
      resourceLogs: logRecordsToResourceLogs(logRecords, encoder)
    };
  }
  function createResourceMap(logRecords) {
    const resourceMap = /* @__PURE__ */ new Map();
    for (const record of logRecords) {
      const { resource, instrumentationScope: { name, version = "", schemaUrl = "" } } = record;
      let ismMap = resourceMap.get(resource);
      if (!ismMap) {
        ismMap = /* @__PURE__ */ new Map();
        resourceMap.set(resource, ismMap);
      }
      const ismKey = `${name}@${version}:${schemaUrl}`;
      let records = ismMap.get(ismKey);
      if (!records) {
        records = [];
        ismMap.set(ismKey, records);
      }
      records.push(record);
    }
    return resourceMap;
  }
  function logRecordsToResourceLogs(logRecords, encoder) {
    const resourceMap = createResourceMap(logRecords);
    return Array.from(resourceMap, ([resource, ismMap]) => {
      const processedResource = createResource(resource);
      return {
        resource: processedResource,
        scopeLogs: Array.from(ismMap, ([, scopeLogs]) => {
          return {
            scope: createInstrumentationScope(scopeLogs[0].instrumentationScope),
            logRecords: scopeLogs.map((log) => toLogRecord(log, encoder)),
            schemaUrl: scopeLogs[0].instrumentationScope.schemaUrl
          };
        }),
        schemaUrl: processedResource.schemaUrl
      };
    });
  }
  function toLogRecord(log, encoder) {
    return {
      timeUnixNano: encoder.encodeHrTime(log.hrTime),
      observedTimeUnixNano: encoder.encodeHrTime(log.hrTimeObserved),
      severityNumber: toSeverityNumber(log.severityNumber),
      severityText: log.severityText,
      body: toAnyValue(log.body),
      eventName: log.eventName,
      attributes: toLogAttributes(log.attributes),
      droppedAttributesCount: log.droppedAttributesCount,
      flags: log.spanContext?.traceFlags,
      traceId: encoder.encodeOptionalSpanContext(log.spanContext?.traceId),
      spanId: encoder.encodeOptionalSpanContext(log.spanContext?.spanId)
    };
  }
  function toSeverityNumber(severityNumber) {
    return severityNumber;
  }
  function toLogAttributes(attributes) {
    return Object.keys(attributes).map((key) => toKeyValue(key, attributes[key]));
  }

  // node_modules/@opentelemetry/sdk-metrics/build/esm/export/AggregationTemporality.js
  var AggregationTemporality;
  (function(AggregationTemporality2) {
    AggregationTemporality2[AggregationTemporality2["DELTA"] = 0] = "DELTA";
    AggregationTemporality2[AggregationTemporality2["CUMULATIVE"] = 1] = "CUMULATIVE";
  })(AggregationTemporality || (AggregationTemporality = {}));

  // node_modules/@opentelemetry/sdk-metrics/build/esm/export/MetricData.js
  var InstrumentType;
  (function(InstrumentType2) {
    InstrumentType2["COUNTER"] = "COUNTER";
    InstrumentType2["GAUGE"] = "GAUGE";
    InstrumentType2["HISTOGRAM"] = "HISTOGRAM";
    InstrumentType2["UP_DOWN_COUNTER"] = "UP_DOWN_COUNTER";
    InstrumentType2["OBSERVABLE_COUNTER"] = "OBSERVABLE_COUNTER";
    InstrumentType2["OBSERVABLE_GAUGE"] = "OBSERVABLE_GAUGE";
    InstrumentType2["OBSERVABLE_UP_DOWN_COUNTER"] = "OBSERVABLE_UP_DOWN_COUNTER";
  })(InstrumentType || (InstrumentType = {}));
  var DataPointType;
  (function(DataPointType2) {
    DataPointType2[DataPointType2["HISTOGRAM"] = 0] = "HISTOGRAM";
    DataPointType2[DataPointType2["EXPONENTIAL_HISTOGRAM"] = 1] = "EXPONENTIAL_HISTOGRAM";
    DataPointType2[DataPointType2["GAUGE"] = 2] = "GAUGE";
    DataPointType2[DataPointType2["SUM"] = 3] = "SUM";
  })(DataPointType || (DataPointType = {}));

  // node_modules/@opentelemetry/sdk-metrics/build/esm/utils.js
  function isNotNullish(item) {
    return item !== void 0 && item !== null;
  }
  function hashAttributes(attributes) {
    let keys = Object.keys(attributes);
    if (keys.length === 0)
      return "";
    keys = keys.sort();
    return JSON.stringify(keys.map((key) => [key, attributes[key]]));
  }
  function instrumentationScopeId(instrumentationScope) {
    return `${instrumentationScope.name}:${instrumentationScope.version ?? ""}:${instrumentationScope.schemaUrl ?? ""}`;
  }
  var TimeoutError2 = class _TimeoutError extends Error {
    constructor(message) {
      super(message);
      Object.setPrototypeOf(this, _TimeoutError.prototype);
    }
  };
  function callWithTimeout2(promise, timeout) {
    let timeoutHandle;
    const timeoutPromise = new Promise(function timeoutFunction(_resolve, reject) {
      timeoutHandle = setTimeout(function timeoutHandler() {
        reject(new TimeoutError2("Operation timed out."));
      }, timeout);
    });
    return Promise.race([promise, timeoutPromise]).then((result) => {
      clearTimeout(timeoutHandle);
      return result;
    }, (reason) => {
      clearTimeout(timeoutHandle);
      throw reason;
    });
  }
  async function PromiseAllSettled(promises) {
    return Promise.all(promises.map(async (p) => {
      try {
        const ret = await p;
        return {
          status: "fulfilled",
          value: ret
        };
      } catch (e) {
        return {
          status: "rejected",
          reason: e
        };
      }
    }));
  }
  function isPromiseAllSettledRejectionResult(it) {
    return it.status === "rejected";
  }
  function FlatMap(arr, fn) {
    const result = [];
    arr.forEach((it) => {
      result.push(...fn(it));
    });
    return result;
  }
  function setEquals(lhs, rhs) {
    if (lhs.size !== rhs.size) {
      return false;
    }
    for (const item of lhs) {
      if (!rhs.has(item)) {
        return false;
      }
    }
    return true;
  }
  function binarySearchUB(arr, value) {
    let lo = 0;
    let hi = arr.length - 1;
    let ret = arr.length;
    while (hi >= lo) {
      const mid = lo + Math.trunc((hi - lo) / 2);
      if (arr[mid] < value) {
        lo = mid + 1;
      } else {
        ret = mid;
        hi = mid - 1;
      }
    }
    return ret;
  }
  function equalsCaseInsensitive(lhs, rhs) {
    return lhs.toLowerCase() === rhs.toLowerCase();
  }

  // node_modules/@opentelemetry/sdk-metrics/build/esm/aggregator/types.js
  var AggregatorKind;
  (function(AggregatorKind2) {
    AggregatorKind2[AggregatorKind2["DROP"] = 0] = "DROP";
    AggregatorKind2[AggregatorKind2["SUM"] = 1] = "SUM";
    AggregatorKind2[AggregatorKind2["LAST_VALUE"] = 2] = "LAST_VALUE";
    AggregatorKind2[AggregatorKind2["HISTOGRAM"] = 3] = "HISTOGRAM";
    AggregatorKind2[AggregatorKind2["EXPONENTIAL_HISTOGRAM"] = 4] = "EXPONENTIAL_HISTOGRAM";
  })(AggregatorKind || (AggregatorKind = {}));

  // node_modules/@opentelemetry/sdk-metrics/build/esm/aggregator/Drop.js
  var DropAggregator = class {
    kind = AggregatorKind.DROP;
    createAccumulation() {
      return void 0;
    }
    merge(_previous, _delta) {
      return void 0;
    }
    diff(_previous, _current) {
      return void 0;
    }
    toMetricData(_descriptor, _aggregationTemporality, _accumulationByAttributes, _endTime) {
      return void 0;
    }
  };

  // node_modules/@opentelemetry/sdk-metrics/build/esm/aggregator/Histogram.js
  function createNewEmptyCheckpoint(boundaries) {
    const counts = boundaries.map(() => 0);
    counts.push(0);
    return {
      buckets: {
        boundaries,
        counts
      },
      sum: 0,
      count: 0,
      hasMinMax: false,
      min: Infinity,
      max: -Infinity
    };
  }
  var HistogramAccumulation = class {
    startTime;
    _boundaries;
    _recordMinMax;
    _current;
    constructor(startTime, _boundaries, _recordMinMax = true, _current = createNewEmptyCheckpoint(_boundaries)) {
      this.startTime = startTime;
      this._boundaries = _boundaries;
      this._recordMinMax = _recordMinMax;
      this._current = _current;
    }
    record(value) {
      if (Number.isNaN(value)) {
        return;
      }
      this._current.count += 1;
      this._current.sum += value;
      if (this._recordMinMax) {
        this._current.min = Math.min(value, this._current.min);
        this._current.max = Math.max(value, this._current.max);
        this._current.hasMinMax = true;
      }
      const idx = binarySearchUB(this._boundaries, value);
      this._current.buckets.counts[idx] += 1;
    }
    setStartTime(startTime) {
      this.startTime = startTime;
    }
    toPointValue() {
      return this._current;
    }
  };
  var HistogramAggregator = class {
    _boundaries;
    _recordMinMax;
    kind = AggregatorKind.HISTOGRAM;
    /**
     * @param _boundaries sorted upper bounds of recorded values.
     * @param _recordMinMax If set to true, min and max will be recorded. Otherwise, min and max will not be recorded.
     */
    constructor(_boundaries, _recordMinMax) {
      this._boundaries = _boundaries;
      this._recordMinMax = _recordMinMax;
    }
    createAccumulation(startTime) {
      return new HistogramAccumulation(startTime, this._boundaries, this._recordMinMax);
    }
    /**
     * Return the result of the merge of two histogram accumulations. As long as one Aggregator
     * instance produces all Accumulations with constant boundaries we don't need to worry about
     * merging accumulations with different boundaries.
     */
    merge(previous, delta) {
      const previousValue = previous.toPointValue();
      const deltaValue = delta.toPointValue();
      const previousCounts = previousValue.buckets.counts;
      const deltaCounts = deltaValue.buckets.counts;
      const mergedCounts = new Array(previousCounts.length);
      for (let idx = 0; idx < previousCounts.length; idx++) {
        mergedCounts[idx] = previousCounts[idx] + deltaCounts[idx];
      }
      let min = Infinity;
      let max = -Infinity;
      if (this._recordMinMax) {
        if (previousValue.hasMinMax && deltaValue.hasMinMax) {
          min = Math.min(previousValue.min, deltaValue.min);
          max = Math.max(previousValue.max, deltaValue.max);
        } else if (previousValue.hasMinMax) {
          min = previousValue.min;
          max = previousValue.max;
        } else if (deltaValue.hasMinMax) {
          min = deltaValue.min;
          max = deltaValue.max;
        }
      }
      return new HistogramAccumulation(previous.startTime, previousValue.buckets.boundaries, this._recordMinMax, {
        buckets: {
          boundaries: previousValue.buckets.boundaries,
          counts: mergedCounts
        },
        count: previousValue.count + deltaValue.count,
        sum: previousValue.sum + deltaValue.sum,
        hasMinMax: this._recordMinMax && (previousValue.hasMinMax || deltaValue.hasMinMax),
        min,
        max
      });
    }
    /**
     * Returns a new DELTA aggregation by comparing two cumulative measurements.
     */
    diff(previous, current) {
      const previousValue = previous.toPointValue();
      const currentValue = current.toPointValue();
      const previousCounts = previousValue.buckets.counts;
      const currentCounts = currentValue.buckets.counts;
      const diffedCounts = new Array(previousCounts.length);
      for (let idx = 0; idx < previousCounts.length; idx++) {
        diffedCounts[idx] = currentCounts[idx] - previousCounts[idx];
      }
      return new HistogramAccumulation(current.startTime, previousValue.buckets.boundaries, this._recordMinMax, {
        buckets: {
          boundaries: previousValue.buckets.boundaries,
          counts: diffedCounts
        },
        count: currentValue.count - previousValue.count,
        sum: currentValue.sum - previousValue.sum,
        hasMinMax: false,
        min: Infinity,
        max: -Infinity
      });
    }
    toMetricData(descriptor, aggregationTemporality, accumulationByAttributes, endTime) {
      return {
        descriptor,
        aggregationTemporality,
        dataPointType: DataPointType.HISTOGRAM,
        dataPoints: accumulationByAttributes.map(([attributes, accumulation]) => {
          const pointValue = accumulation.toPointValue();
          const allowsNegativeValues = descriptor.type === InstrumentType.GAUGE || descriptor.type === InstrumentType.UP_DOWN_COUNTER || descriptor.type === InstrumentType.OBSERVABLE_GAUGE || descriptor.type === InstrumentType.OBSERVABLE_UP_DOWN_COUNTER;
          return {
            attributes,
            startTime: accumulation.startTime,
            endTime,
            value: {
              min: pointValue.hasMinMax ? pointValue.min : void 0,
              max: pointValue.hasMinMax ? pointValue.max : void 0,
              sum: !allowsNegativeValues ? pointValue.sum : void 0,
              buckets: pointValue.buckets,
              count: pointValue.count
            }
          };
        })
      };
    }
  };

  // node_modules/@opentelemetry/sdk-metrics/build/esm/aggregator/exponential-histogram/Buckets.js
  var Buckets = class _Buckets {
    backing;
    indexBase;
    indexStart;
    indexEnd;
    /**
     * The term index refers to the number of the exponential histogram bucket
     * used to determine its boundaries. The lower boundary of a bucket is
     * determined by base ** index and the upper boundary of a bucket is
     * determined by base ** (index + 1). index values are signed to account
     * for values less than or equal to 1.
     *
     * indexBase is the index of the 0th position in the
     * backing array, i.e., backing[0] is the count
     * in the bucket with index `indexBase`.
     *
     * indexStart is the smallest index value represented
     * in the backing array.
     *
     * indexEnd is the largest index value represented in
     * the backing array.
     */
    constructor(backing = new BucketsBacking(), indexBase = 0, indexStart = 0, indexEnd = 0) {
      this.backing = backing;
      this.indexBase = indexBase;
      this.indexStart = indexStart;
      this.indexEnd = indexEnd;
    }
    /**
     * Offset is the bucket index of the smallest entry in the counts array
     * @returns {number}
     */
    get offset() {
      return this.indexStart;
    }
    /**
     * Buckets is a view into the backing array.
     * @returns {number}
     */
    get length() {
      if (this.backing.length === 0) {
        return 0;
      }
      if (this.indexEnd === this.indexStart && this.at(0) === 0) {
        return 0;
      }
      return this.indexEnd - this.indexStart + 1;
    }
    /**
     * An array of counts, where count[i] carries the count
     * of the bucket at index (offset+i).  count[i] is the count of
     * values greater than base^(offset+i) and less than or equal to
     * base^(offset+i+1).
     * @returns {number} The logical counts based on the backing array
     */
    counts() {
      return Array.from({ length: this.length }, (_, i) => this.at(i));
    }
    /**
     * At returns the count of the bucket at a position in the logical
     * array of counts.
     * @param position
     * @returns {number}
     */
    at(position) {
      const bias = this.indexBase - this.indexStart;
      if (position < bias) {
        position += this.backing.length;
      }
      position -= bias;
      return this.backing.countAt(position);
    }
    /**
     * incrementBucket increments the backing array index by `increment`
     * @param bucketIndex
     * @param increment
     */
    incrementBucket(bucketIndex, increment) {
      this.backing.increment(bucketIndex, increment);
    }
    /**
     * decrementBucket decrements the backing array index by `decrement`
     * if decrement is greater than the current value, it's set to 0.
     * @param bucketIndex
     * @param decrement
     */
    decrementBucket(bucketIndex, decrement) {
      this.backing.decrement(bucketIndex, decrement);
    }
    /**
     * trim removes leading and / or trailing zero buckets (which can occur
     * after diffing two histos) and rotates the backing array so that the
     * smallest non-zero index is in the 0th position of the backing array
     */
    trim() {
      for (let i = 0; i < this.length; i++) {
        if (this.at(i) !== 0) {
          this.indexStart += i;
          break;
        } else if (i === this.length - 1) {
          this.indexStart = this.indexEnd = this.indexBase = 0;
          return;
        }
      }
      for (let i = this.length - 1; i >= 0; i--) {
        if (this.at(i) !== 0) {
          this.indexEnd -= this.length - i - 1;
          break;
        }
      }
      this._rotate();
    }
    /**
     * downscale first rotates, then collapses 2**`by`-to-1 buckets.
     * @param by
     */
    downscale(by) {
      this._rotate();
      const size = 1 + this.indexEnd - this.indexStart;
      const each = 1 << by;
      let inpos = 0;
      let outpos = 0;
      for (let pos = this.indexStart; pos <= this.indexEnd; ) {
        let mod = pos % each;
        if (mod < 0) {
          mod += each;
        }
        for (let i = mod; i < each && inpos < size; i++) {
          this._relocateBucket(outpos, inpos);
          inpos++;
          pos++;
        }
        outpos++;
      }
      this.indexStart >>= by;
      this.indexEnd >>= by;
      this.indexBase = this.indexStart;
    }
    /**
     * Clone returns a deep copy of Buckets
     * @returns {Buckets}
     */
    clone() {
      return new _Buckets(this.backing.clone(), this.indexBase, this.indexStart, this.indexEnd);
    }
    /**
     * _rotate shifts the backing array contents so that indexStart ==
     * indexBase to simplify the downscale logic.
     */
    _rotate() {
      const bias = this.indexBase - this.indexStart;
      if (bias === 0) {
        return;
      } else if (bias > 0) {
        this.backing.reverse(0, this.backing.length);
        this.backing.reverse(0, bias);
        this.backing.reverse(bias, this.backing.length);
      } else {
        this.backing.reverse(0, this.backing.length);
        this.backing.reverse(0, this.backing.length + bias);
      }
      this.indexBase = this.indexStart;
    }
    /**
     * _relocateBucket adds the count in counts[src] to counts[dest] and
     * resets count[src] to zero.
     */
    _relocateBucket(dest, src) {
      if (dest === src) {
        return;
      }
      this.incrementBucket(dest, this.backing.emptyBucket(src));
    }
  };
  var BucketsBacking = class _BucketsBacking {
    _counts;
    constructor(_counts = [0]) {
      this._counts = _counts;
    }
    /**
     * length returns the physical size of the backing array, which
     * is >= buckets.length()
     */
    get length() {
      return this._counts.length;
    }
    /**
     * countAt returns the count in a specific bucket
     */
    countAt(pos) {
      return this._counts[pos];
    }
    /**
     * growTo grows a backing array and copies old entries
     * into their correct new positions.
     */
    growTo(newSize, oldPositiveLimit, newPositiveLimit) {
      const tmp = new Array(newSize).fill(0);
      tmp.splice(newPositiveLimit, this._counts.length - oldPositiveLimit, ...this._counts.slice(oldPositiveLimit));
      tmp.splice(0, oldPositiveLimit, ...this._counts.slice(0, oldPositiveLimit));
      this._counts = tmp;
    }
    /**
     * reverse the items in the backing array in the range [from, limit).
     */
    reverse(from, limit) {
      const num = Math.floor((from + limit) / 2) - from;
      for (let i = 0; i < num; i++) {
        const tmp = this._counts[from + i];
        this._counts[from + i] = this._counts[limit - i - 1];
        this._counts[limit - i - 1] = tmp;
      }
    }
    /**
     * emptyBucket empties the count from a bucket, for
     * moving into another.
     */
    emptyBucket(src) {
      const tmp = this._counts[src];
      this._counts[src] = 0;
      return tmp;
    }
    /**
     * increments a bucket by `increment`
     */
    increment(bucketIndex, increment) {
      this._counts[bucketIndex] += increment;
    }
    /**
     * decrements a bucket by `decrement`
     */
    decrement(bucketIndex, decrement) {
      if (this._counts[bucketIndex] >= decrement) {
        this._counts[bucketIndex] -= decrement;
      } else {
        this._counts[bucketIndex] = 0;
      }
    }
    /**
     * clone returns a deep copy of BucketsBacking
     */
    clone() {
      return new _BucketsBacking([...this._counts]);
    }
  };

  // node_modules/@opentelemetry/sdk-metrics/build/esm/aggregator/exponential-histogram/mapping/ieee754.js
  var SIGNIFICAND_WIDTH = 52;
  var EXPONENT_MASK = 2146435072;
  var SIGNIFICAND_MASK = 1048575;
  var EXPONENT_BIAS = 1023;
  var MIN_NORMAL_EXPONENT = -EXPONENT_BIAS + 1;
  var MAX_NORMAL_EXPONENT = EXPONENT_BIAS;
  var MIN_VALUE = Math.pow(2, -1022);
  function getNormalBase2(value) {
    const dv = new DataView(new ArrayBuffer(8));
    dv.setFloat64(0, value);
    const hiBits = dv.getUint32(0);
    const expBits = (hiBits & EXPONENT_MASK) >> 20;
    return expBits - EXPONENT_BIAS;
  }
  function getSignificand(value) {
    const dv = new DataView(new ArrayBuffer(8));
    dv.setFloat64(0, value);
    const hiBits = dv.getUint32(0);
    const loBits = dv.getUint32(4);
    const significandHiBits = (hiBits & SIGNIFICAND_MASK) * Math.pow(2, 32);
    return significandHiBits + loBits;
  }

  // node_modules/@opentelemetry/sdk-metrics/build/esm/aggregator/exponential-histogram/util.js
  function ldexp(frac, exp) {
    if (frac === 0 || frac === Number.POSITIVE_INFINITY || frac === Number.NEGATIVE_INFINITY || Number.isNaN(frac)) {
      return frac;
    }
    return frac * Math.pow(2, exp);
  }
  function nextGreaterSquare(v) {
    v--;
    v |= v >> 1;
    v |= v >> 2;
    v |= v >> 4;
    v |= v >> 8;
    v |= v >> 16;
    v++;
    return v;
  }

  // node_modules/@opentelemetry/sdk-metrics/build/esm/aggregator/exponential-histogram/mapping/types.js
  var MappingError = class extends Error {
  };

  // node_modules/@opentelemetry/sdk-metrics/build/esm/aggregator/exponential-histogram/mapping/ExponentMapping.js
  var ExponentMapping = class {
    _shift;
    constructor(scale) {
      this._shift = -scale;
    }
    /**
     * Maps positive floating point values to indexes corresponding to scale
     * @param value
     * @returns {number} index for provided value at the current scale
     */
    mapToIndex(value) {
      if (value < MIN_VALUE) {
        return this._minNormalLowerBoundaryIndex();
      }
      const exp = getNormalBase2(value);
      const correction = this._rightShift(getSignificand(value) - 1, SIGNIFICAND_WIDTH);
      return exp + correction >> this._shift;
    }
    /**
     * Returns the lower bucket boundary for the given index for scale
     *
     * @param index
     * @returns {number}
     */
    lowerBoundary(index) {
      const minIndex = this._minNormalLowerBoundaryIndex();
      if (index < minIndex) {
        throw new MappingError(`underflow: ${index} is < minimum lower boundary: ${minIndex}`);
      }
      const maxIndex = this._maxNormalLowerBoundaryIndex();
      if (index > maxIndex) {
        throw new MappingError(`overflow: ${index} is > maximum lower boundary: ${maxIndex}`);
      }
      return ldexp(1, index << this._shift);
    }
    /**
     * The scale used by this mapping
     * @returns {number}
     */
    get scale() {
      if (this._shift === 0) {
        return 0;
      }
      return -this._shift;
    }
    _minNormalLowerBoundaryIndex() {
      let index = MIN_NORMAL_EXPONENT >> this._shift;
      if (this._shift < 2) {
        index--;
      }
      return index;
    }
    _maxNormalLowerBoundaryIndex() {
      return MAX_NORMAL_EXPONENT >> this._shift;
    }
    _rightShift(value, shift) {
      return Math.floor(value * Math.pow(2, -shift));
    }
  };

  // node_modules/@opentelemetry/sdk-metrics/build/esm/aggregator/exponential-histogram/mapping/LogarithmMapping.js
  var LogarithmMapping = class {
    _scale;
    _scaleFactor;
    _inverseFactor;
    constructor(scale) {
      this._scale = scale;
      this._scaleFactor = ldexp(Math.LOG2E, scale);
      this._inverseFactor = ldexp(Math.LN2, -scale);
    }
    /**
     * Maps positive floating point values to indexes corresponding to scale
     * @param value
     * @returns {number} index for provided value at the current scale
     */
    mapToIndex(value) {
      if (value <= MIN_VALUE) {
        return this._minNormalLowerBoundaryIndex() - 1;
      }
      if (getSignificand(value) === 0) {
        const exp = getNormalBase2(value);
        return (exp << this._scale) - 1;
      }
      const index = Math.floor(Math.log(value) * this._scaleFactor);
      const maxIndex = this._maxNormalLowerBoundaryIndex();
      if (index >= maxIndex) {
        return maxIndex;
      }
      return index;
    }
    /**
     * Returns the lower bucket boundary for the given index for scale
     *
     * @param index
     * @returns {number}
     */
    lowerBoundary(index) {
      const maxIndex = this._maxNormalLowerBoundaryIndex();
      if (index >= maxIndex) {
        if (index === maxIndex) {
          return 2 * Math.exp((index - (1 << this._scale)) / this._scaleFactor);
        }
        throw new MappingError(`overflow: ${index} is > maximum lower boundary: ${maxIndex}`);
      }
      const minIndex = this._minNormalLowerBoundaryIndex();
      if (index <= minIndex) {
        if (index === minIndex) {
          return MIN_VALUE;
        } else if (index === minIndex - 1) {
          return Math.exp((index + (1 << this._scale)) / this._scaleFactor) / 2;
        }
        throw new MappingError(`overflow: ${index} is < minimum lower boundary: ${minIndex}`);
      }
      return Math.exp(index * this._inverseFactor);
    }
    /**
     * The scale used by this mapping
     * @returns {number}
     */
    get scale() {
      return this._scale;
    }
    _minNormalLowerBoundaryIndex() {
      return MIN_NORMAL_EXPONENT << this._scale;
    }
    _maxNormalLowerBoundaryIndex() {
      return (MAX_NORMAL_EXPONENT + 1 << this._scale) - 1;
    }
  };

  // node_modules/@opentelemetry/sdk-metrics/build/esm/aggregator/exponential-histogram/mapping/getMapping.js
  var MIN_SCALE = -10;
  var MAX_SCALE = 20;
  var PREBUILT_MAPPINGS = Array.from({ length: 31 }, (_, i) => {
    if (i > 10) {
      return new LogarithmMapping(i - 10);
    }
    return new ExponentMapping(i - 10);
  });
  function getMapping(scale) {
    if (scale > MAX_SCALE || scale < MIN_SCALE) {
      throw new MappingError(`expected scale >= ${MIN_SCALE} && <= ${MAX_SCALE}, got: ${scale}`);
    }
    return PREBUILT_MAPPINGS[scale + 10];
  }

  // node_modules/@opentelemetry/sdk-metrics/build/esm/aggregator/ExponentialHistogram.js
  var HighLow = class _HighLow {
    low;
    high;
    static combine(h1, h2) {
      return new _HighLow(Math.min(h1.low, h2.low), Math.max(h1.high, h2.high));
    }
    constructor(low, high) {
      this.low = low;
      this.high = high;
    }
  };
  var MAX_SCALE2 = 20;
  var DEFAULT_MAX_SIZE = 160;
  var MIN_MAX_SIZE = 2;
  var ExponentialHistogramAccumulation = class _ExponentialHistogramAccumulation {
    startTime;
    _maxSize;
    _recordMinMax;
    _sum;
    _count;
    _zeroCount;
    _min;
    _max;
    _positive;
    _negative;
    _mapping;
    constructor(startTime, _maxSize = DEFAULT_MAX_SIZE, _recordMinMax = true, _sum = 0, _count = 0, _zeroCount = 0, _min = Number.POSITIVE_INFINITY, _max = Number.NEGATIVE_INFINITY, _positive = new Buckets(), _negative = new Buckets(), _mapping = getMapping(MAX_SCALE2)) {
      this.startTime = startTime;
      this._maxSize = _maxSize;
      this._recordMinMax = _recordMinMax;
      this._sum = _sum;
      this._count = _count;
      this._zeroCount = _zeroCount;
      this._min = _min;
      this._max = _max;
      this._positive = _positive;
      this._negative = _negative;
      this._mapping = _mapping;
      if (this._maxSize < MIN_MAX_SIZE) {
        diag2.warn(`Exponential Histogram Max Size set to ${this._maxSize},                 changing to the minimum size of: ${MIN_MAX_SIZE}`);
        this._maxSize = MIN_MAX_SIZE;
      }
    }
    /**
     * record updates a histogram with a single count
     * @param {Number} value
     */
    record(value) {
      this.updateByIncrement(value, 1);
    }
    /**
     * Sets the start time for this accumulation
     * @param {HrTime} startTime
     */
    setStartTime(startTime) {
      this.startTime = startTime;
    }
    /**
     * Returns the datapoint representation of this accumulation
     * @param {HrTime} startTime
     */
    toPointValue() {
      return {
        hasMinMax: this._recordMinMax,
        min: this.min,
        max: this.max,
        sum: this.sum,
        positive: {
          offset: this.positive.offset,
          bucketCounts: this.positive.counts()
        },
        negative: {
          offset: this.negative.offset,
          bucketCounts: this.negative.counts()
        },
        count: this.count,
        scale: this.scale,
        zeroCount: this.zeroCount
      };
    }
    /**
     * @returns {Number} The sum of values recorded by this accumulation
     */
    get sum() {
      return this._sum;
    }
    /**
     * @returns {Number} The minimum value recorded by this accumulation
     */
    get min() {
      return this._min;
    }
    /**
     * @returns {Number} The maximum value recorded by this accumulation
     */
    get max() {
      return this._max;
    }
    /**
     * @returns {Number} The count of values recorded by this accumulation
     */
    get count() {
      return this._count;
    }
    /**
     * @returns {Number} The number of 0 values recorded by this accumulation
     */
    get zeroCount() {
      return this._zeroCount;
    }
    /**
     * @returns {Number} The scale used by this accumulation
     */
    get scale() {
      if (this._count === this._zeroCount) {
        return 0;
      }
      return this._mapping.scale;
    }
    /**
     * positive holds the positive values
     * @returns {Buckets}
     */
    get positive() {
      return this._positive;
    }
    /**
     * negative holds the negative values by their absolute value
     * @returns {Buckets}
     */
    get negative() {
      return this._negative;
    }
    /**
     * updateByIncr supports updating a histogram with a non-negative
     * increment.
     * @param value
     * @param increment
     */
    updateByIncrement(value, increment) {
      if (Number.isNaN(value)) {
        return;
      }
      if (value > this._max) {
        this._max = value;
      }
      if (value < this._min) {
        this._min = value;
      }
      this._count += increment;
      if (value === 0) {
        this._zeroCount += increment;
        return;
      }
      this._sum += value * increment;
      if (value > 0) {
        this._updateBuckets(this._positive, value, increment);
      } else {
        this._updateBuckets(this._negative, -value, increment);
      }
    }
    /**
     * merge combines data from previous value into self
     * @param {ExponentialHistogramAccumulation} previous
     */
    merge(previous) {
      if (this._count === 0) {
        this._min = previous.min;
        this._max = previous.max;
      } else if (previous.count !== 0) {
        if (previous.min < this.min) {
          this._min = previous.min;
        }
        if (previous.max > this.max) {
          this._max = previous.max;
        }
      }
      this.startTime = previous.startTime;
      this._sum += previous.sum;
      this._count += previous.count;
      this._zeroCount += previous.zeroCount;
      const minScale = this._minScale(previous);
      this._downscale(this.scale - minScale);
      this._mergeBuckets(this.positive, previous, previous.positive, minScale);
      this._mergeBuckets(this.negative, previous, previous.negative, minScale);
    }
    /**
     * diff subtracts other from self
     * @param {ExponentialHistogramAccumulation} other
     */
    diff(other) {
      this._min = Infinity;
      this._max = -Infinity;
      this._sum -= other.sum;
      this._count -= other.count;
      this._zeroCount -= other.zeroCount;
      const minScale = this._minScale(other);
      this._downscale(this.scale - minScale);
      this._diffBuckets(this.positive, other, other.positive, minScale);
      this._diffBuckets(this.negative, other, other.negative, minScale);
    }
    /**
     * clone returns a deep copy of self
     * @returns {ExponentialHistogramAccumulation}
     */
    clone() {
      return new _ExponentialHistogramAccumulation(this.startTime, this._maxSize, this._recordMinMax, this._sum, this._count, this._zeroCount, this._min, this._max, this.positive.clone(), this.negative.clone(), this._mapping);
    }
    /**
     * _updateBuckets maps the incoming value to a bucket index for the current
     * scale. If the bucket index is outside of the range of the backing array,
     * it will rescale the backing array and update the mapping for the new scale.
     */
    _updateBuckets(buckets, value, increment) {
      let index = this._mapping.mapToIndex(value);
      let rescalingNeeded = false;
      let high = 0;
      let low = 0;
      if (buckets.length === 0) {
        buckets.indexStart = index;
        buckets.indexEnd = buckets.indexStart;
        buckets.indexBase = buckets.indexStart;
      } else if (index < buckets.indexStart && buckets.indexEnd - index >= this._maxSize) {
        rescalingNeeded = true;
        low = index;
        high = buckets.indexEnd;
      } else if (index > buckets.indexEnd && index - buckets.indexStart >= this._maxSize) {
        rescalingNeeded = true;
        low = buckets.indexStart;
        high = index;
      }
      if (rescalingNeeded) {
        const change = this._changeScale(high, low);
        this._downscale(change);
        index = this._mapping.mapToIndex(value);
      }
      this._incrementIndexBy(buckets, index, increment);
    }
    /**
     * _incrementIndexBy increments the count of the bucket specified by `index`.
     * If the index is outside of the range [buckets.indexStart, buckets.indexEnd]
     * the boundaries of the backing array will be adjusted and more buckets will
     * be added if needed.
     */
    _incrementIndexBy(buckets, index, increment) {
      if (increment === 0) {
        return;
      }
      if (buckets.length === 0) {
        buckets.indexStart = buckets.indexEnd = buckets.indexBase = index;
      }
      if (index < buckets.indexStart) {
        const span = buckets.indexEnd - index;
        if (span >= buckets.backing.length) {
          this._grow(buckets, span + 1);
        }
        buckets.indexStart = index;
      } else if (index > buckets.indexEnd) {
        const span = index - buckets.indexStart;
        if (span >= buckets.backing.length) {
          this._grow(buckets, span + 1);
        }
        buckets.indexEnd = index;
      }
      let bucketIndex = index - buckets.indexBase;
      if (bucketIndex < 0) {
        bucketIndex += buckets.backing.length;
      }
      buckets.incrementBucket(bucketIndex, increment);
    }
    /**
     * grow resizes the backing array by doubling in size up to maxSize.
     * This extends the array with a bunch of zeros and copies the
     * existing counts to the same position.
     */
    _grow(buckets, needed) {
      const size = buckets.backing.length;
      const bias = buckets.indexBase - buckets.indexStart;
      const oldPositiveLimit = size - bias;
      let newSize = nextGreaterSquare(needed);
      if (newSize > this._maxSize) {
        newSize = this._maxSize;
      }
      const newPositiveLimit = newSize - bias;
      buckets.backing.growTo(newSize, oldPositiveLimit, newPositiveLimit);
    }
    /**
     * _changeScale computes how much downscaling is needed by shifting the
     * high and low values until they are separated by no more than size.
     */
    _changeScale(high, low) {
      let change = 0;
      while (high - low >= this._maxSize) {
        high >>= 1;
        low >>= 1;
        change++;
      }
      return change;
    }
    /**
     * _downscale subtracts `change` from the current mapping scale.
     */
    _downscale(change) {
      if (change === 0) {
        return;
      }
      if (change < 0) {
        throw new Error(`impossible change of scale: ${this.scale}`);
      }
      const newScale = this._mapping.scale - change;
      this._positive.downscale(change);
      this._negative.downscale(change);
      this._mapping = getMapping(newScale);
    }
    /**
     * _minScale is used by diff and merge to compute an ideal combined scale
     */
    _minScale(other) {
      const minScale = Math.min(this.scale, other.scale);
      const highLowPos = HighLow.combine(this._highLowAtScale(this.positive, this.scale, minScale), this._highLowAtScale(other.positive, other.scale, minScale));
      const highLowNeg = HighLow.combine(this._highLowAtScale(this.negative, this.scale, minScale), this._highLowAtScale(other.negative, other.scale, minScale));
      return Math.min(minScale - this._changeScale(highLowPos.high, highLowPos.low), minScale - this._changeScale(highLowNeg.high, highLowNeg.low));
    }
    /**
     * _highLowAtScale is used by diff and merge to compute an ideal combined scale.
     */
    _highLowAtScale(buckets, currentScale, newScale) {
      if (buckets.length === 0) {
        return new HighLow(0, -1);
      }
      const shift = currentScale - newScale;
      return new HighLow(buckets.indexStart >> shift, buckets.indexEnd >> shift);
    }
    /**
     * _mergeBuckets translates index values from another histogram and
     * adds the values into the corresponding buckets of this histogram.
     */
    _mergeBuckets(ours, other, theirs, scale) {
      const theirOffset = theirs.offset;
      const theirChange = other.scale - scale;
      for (let i = 0; i < theirs.length; i++) {
        this._incrementIndexBy(ours, theirOffset + i >> theirChange, theirs.at(i));
      }
    }
    /**
     * _diffBuckets translates index values from another histogram and
     * subtracts the values in the corresponding buckets of this histogram.
     */
    _diffBuckets(ours, other, theirs, scale) {
      const theirOffset = theirs.offset;
      const theirChange = other.scale - scale;
      for (let i = 0; i < theirs.length; i++) {
        const ourIndex = theirOffset + i >> theirChange;
        let bucketIndex = ourIndex - ours.indexBase;
        if (bucketIndex < 0) {
          bucketIndex += ours.backing.length;
        }
        ours.decrementBucket(bucketIndex, theirs.at(i));
      }
      ours.trim();
    }
  };
  var ExponentialHistogramAggregator = class {
    _maxSize;
    _recordMinMax;
    kind = AggregatorKind.EXPONENTIAL_HISTOGRAM;
    /**
     * @param _maxSize Maximum number of buckets for each of the positive
     *    and negative ranges, exclusive of the zero-bucket.
     * @param _recordMinMax If set to true, min and max will be recorded.
     *    Otherwise, min and max will not be recorded.
     */
    constructor(_maxSize, _recordMinMax) {
      this._maxSize = _maxSize;
      this._recordMinMax = _recordMinMax;
    }
    createAccumulation(startTime) {
      return new ExponentialHistogramAccumulation(startTime, this._maxSize, this._recordMinMax);
    }
    /**
     * Return the result of the merge of two exponential histogram accumulations.
     */
    merge(previous, delta) {
      const result = delta.clone();
      result.merge(previous);
      return result;
    }
    /**
     * Returns a new DELTA aggregation by comparing two cumulative measurements.
     */
    diff(previous, current) {
      const result = current.clone();
      result.diff(previous);
      return result;
    }
    toMetricData(descriptor, aggregationTemporality, accumulationByAttributes, endTime) {
      return {
        descriptor,
        aggregationTemporality,
        dataPointType: DataPointType.EXPONENTIAL_HISTOGRAM,
        dataPoints: accumulationByAttributes.map(([attributes, accumulation]) => {
          const pointValue = accumulation.toPointValue();
          const allowsNegativeValues = descriptor.type === InstrumentType.GAUGE || descriptor.type === InstrumentType.UP_DOWN_COUNTER || descriptor.type === InstrumentType.OBSERVABLE_GAUGE || descriptor.type === InstrumentType.OBSERVABLE_UP_DOWN_COUNTER;
          return {
            attributes,
            startTime: accumulation.startTime,
            endTime,
            value: {
              min: pointValue.hasMinMax ? pointValue.min : void 0,
              max: pointValue.hasMinMax ? pointValue.max : void 0,
              sum: !allowsNegativeValues ? pointValue.sum : void 0,
              positive: {
                offset: pointValue.positive.offset,
                bucketCounts: pointValue.positive.bucketCounts
              },
              negative: {
                offset: pointValue.negative.offset,
                bucketCounts: pointValue.negative.bucketCounts
              },
              count: pointValue.count,
              scale: pointValue.scale,
              zeroCount: pointValue.zeroCount
            }
          };
        })
      };
    }
  };

  // node_modules/@opentelemetry/sdk-metrics/build/esm/aggregator/LastValue.js
  var LastValueAccumulation = class {
    startTime;
    _current;
    sampleTime;
    constructor(startTime, _current = 0, sampleTime = [0, 0]) {
      this.startTime = startTime;
      this._current = _current;
      this.sampleTime = sampleTime;
    }
    record(value) {
      this._current = value;
      this.sampleTime = millisToHrTime(Date.now());
    }
    setStartTime(startTime) {
      this.startTime = startTime;
    }
    toPointValue() {
      return this._current;
    }
  };
  var LastValueAggregator = class {
    kind = AggregatorKind.LAST_VALUE;
    createAccumulation(startTime) {
      return new LastValueAccumulation(startTime);
    }
    /**
     * Returns the result of the merge of the given accumulations.
     *
     * Return the newly captured (delta) accumulation for LastValueAggregator.
     */
    merge(previous, delta) {
      const latestAccumulation = hrTimeToMicroseconds(delta.sampleTime) >= hrTimeToMicroseconds(previous.sampleTime) ? delta : previous;
      return new LastValueAccumulation(previous.startTime, latestAccumulation.toPointValue(), latestAccumulation.sampleTime);
    }
    /**
     * Returns a new DELTA aggregation by comparing two cumulative measurements.
     *
     * A delta aggregation is not meaningful to LastValueAggregator, just return
     * the newly captured (delta) accumulation for LastValueAggregator.
     */
    diff(previous, current) {
      const latestAccumulation = hrTimeToMicroseconds(current.sampleTime) >= hrTimeToMicroseconds(previous.sampleTime) ? current : previous;
      return new LastValueAccumulation(current.startTime, latestAccumulation.toPointValue(), latestAccumulation.sampleTime);
    }
    toMetricData(descriptor, aggregationTemporality, accumulationByAttributes, endTime) {
      return {
        descriptor,
        aggregationTemporality,
        dataPointType: DataPointType.GAUGE,
        dataPoints: accumulationByAttributes.map(([attributes, accumulation]) => {
          return {
            attributes,
            startTime: accumulation.startTime,
            endTime,
            value: accumulation.toPointValue()
          };
        })
      };
    }
  };

  // node_modules/@opentelemetry/sdk-metrics/build/esm/aggregator/Sum.js
  var SumAccumulation = class {
    startTime;
    monotonic;
    _current;
    reset;
    constructor(startTime, monotonic, _current = 0, reset = false) {
      this.startTime = startTime;
      this.monotonic = monotonic;
      this._current = _current;
      this.reset = reset;
    }
    record(value) {
      if (this.monotonic && value < 0) {
        return;
      }
      this._current += value;
    }
    setStartTime(startTime) {
      this.startTime = startTime;
    }
    toPointValue() {
      return this._current;
    }
  };
  var SumAggregator = class {
    monotonic;
    kind = AggregatorKind.SUM;
    constructor(monotonic) {
      this.monotonic = monotonic;
    }
    createAccumulation(startTime) {
      return new SumAccumulation(startTime, this.monotonic);
    }
    /**
     * Returns the result of the merge of the given accumulations.
     */
    merge(previous, delta) {
      const prevPv = previous.toPointValue();
      const deltaPv = delta.toPointValue();
      if (delta.reset) {
        return new SumAccumulation(delta.startTime, this.monotonic, deltaPv, delta.reset);
      }
      return new SumAccumulation(previous.startTime, this.monotonic, prevPv + deltaPv);
    }
    /**
     * Returns a new DELTA aggregation by comparing two cumulative measurements.
     */
    diff(previous, current) {
      const prevPv = previous.toPointValue();
      const currPv = current.toPointValue();
      if (this.monotonic && prevPv > currPv) {
        return new SumAccumulation(current.startTime, this.monotonic, currPv, true);
      }
      return new SumAccumulation(current.startTime, this.monotonic, currPv - prevPv);
    }
    toMetricData(descriptor, aggregationTemporality, accumulationByAttributes, endTime) {
      return {
        descriptor,
        aggregationTemporality,
        dataPointType: DataPointType.SUM,
        dataPoints: accumulationByAttributes.map(([attributes, accumulation]) => {
          return {
            attributes,
            startTime: accumulation.startTime,
            endTime,
            value: accumulation.toPointValue()
          };
        }),
        isMonotonic: this.monotonic
      };
    }
  };

  // node_modules/@opentelemetry/sdk-metrics/build/esm/view/Aggregation.js
  var DropAggregation = class _DropAggregation {
    static DEFAULT_INSTANCE = new DropAggregator();
    createAggregator(_instrument) {
      return _DropAggregation.DEFAULT_INSTANCE;
    }
  };
  var SumAggregation = class _SumAggregation {
    static MONOTONIC_INSTANCE = new SumAggregator(true);
    static NON_MONOTONIC_INSTANCE = new SumAggregator(false);
    createAggregator(instrument) {
      switch (instrument.type) {
        case InstrumentType.COUNTER:
        case InstrumentType.OBSERVABLE_COUNTER:
        case InstrumentType.HISTOGRAM: {
          return _SumAggregation.MONOTONIC_INSTANCE;
        }
        default: {
          return _SumAggregation.NON_MONOTONIC_INSTANCE;
        }
      }
    }
  };
  var LastValueAggregation = class _LastValueAggregation {
    static DEFAULT_INSTANCE = new LastValueAggregator();
    createAggregator(_instrument) {
      return _LastValueAggregation.DEFAULT_INSTANCE;
    }
  };
  var HistogramAggregation = class _HistogramAggregation {
    static DEFAULT_INSTANCE = new HistogramAggregator([0, 5, 10, 25, 50, 75, 100, 250, 500, 750, 1e3, 2500, 5e3, 7500, 1e4], true);
    createAggregator(_instrument) {
      return _HistogramAggregation.DEFAULT_INSTANCE;
    }
  };
  var ExplicitBucketHistogramAggregation = class {
    _recordMinMax;
    _boundaries;
    /**
     * @param boundaries the bucket boundaries of the histogram aggregation
     * @param _recordMinMax If set to true, min and max will be recorded. Otherwise, min and max will not be recorded.
     */
    constructor(boundaries, _recordMinMax = true) {
      this._recordMinMax = _recordMinMax;
      if (boundaries == null) {
        throw new Error("ExplicitBucketHistogramAggregation should be created with explicit boundaries, if a single bucket histogram is required, please pass an empty array");
      }
      boundaries = boundaries.concat();
      boundaries = boundaries.sort((a, b) => a - b);
      const minusInfinityIndex = boundaries.lastIndexOf(-Infinity);
      let infinityIndex = boundaries.indexOf(Infinity);
      if (infinityIndex === -1) {
        infinityIndex = void 0;
      }
      this._boundaries = boundaries.slice(minusInfinityIndex + 1, infinityIndex);
    }
    createAggregator(_instrument) {
      return new HistogramAggregator(this._boundaries, this._recordMinMax);
    }
  };
  var ExponentialHistogramAggregation = class {
    _maxSize;
    _recordMinMax;
    constructor(_maxSize = 160, _recordMinMax = true) {
      this._maxSize = _maxSize;
      this._recordMinMax = _recordMinMax;
    }
    createAggregator(_instrument) {
      return new ExponentialHistogramAggregator(this._maxSize, this._recordMinMax);
    }
  };
  var DefaultAggregation = class {
    _resolve(instrument) {
      switch (instrument.type) {
        case InstrumentType.COUNTER:
        case InstrumentType.UP_DOWN_COUNTER:
        case InstrumentType.OBSERVABLE_COUNTER:
        case InstrumentType.OBSERVABLE_UP_DOWN_COUNTER: {
          return SUM_AGGREGATION;
        }
        case InstrumentType.GAUGE:
        case InstrumentType.OBSERVABLE_GAUGE: {
          return LAST_VALUE_AGGREGATION;
        }
        case InstrumentType.HISTOGRAM: {
          if (instrument.advice.explicitBucketBoundaries) {
            return new ExplicitBucketHistogramAggregation(instrument.advice.explicitBucketBoundaries);
          }
          return HISTOGRAM_AGGREGATION;
        }
      }
      diag2.warn(`Unable to recognize instrument type: ${instrument.type}`);
      return DROP_AGGREGATION;
    }
    createAggregator(instrument) {
      return this._resolve(instrument).createAggregator(instrument);
    }
  };
  var DROP_AGGREGATION = new DropAggregation();
  var SUM_AGGREGATION = new SumAggregation();
  var LAST_VALUE_AGGREGATION = new LastValueAggregation();
  var HISTOGRAM_AGGREGATION = new HistogramAggregation();
  var EXPONENTIAL_HISTOGRAM_AGGREGATION = new ExponentialHistogramAggregation();
  var DEFAULT_AGGREGATION = new DefaultAggregation();

  // node_modules/@opentelemetry/sdk-metrics/build/esm/view/AggregationOption.js
  var AggregationType;
  (function(AggregationType2) {
    AggregationType2[AggregationType2["DEFAULT"] = 0] = "DEFAULT";
    AggregationType2[AggregationType2["DROP"] = 1] = "DROP";
    AggregationType2[AggregationType2["SUM"] = 2] = "SUM";
    AggregationType2[AggregationType2["LAST_VALUE"] = 3] = "LAST_VALUE";
    AggregationType2[AggregationType2["EXPLICIT_BUCKET_HISTOGRAM"] = 4] = "EXPLICIT_BUCKET_HISTOGRAM";
    AggregationType2[AggregationType2["EXPONENTIAL_HISTOGRAM"] = 5] = "EXPONENTIAL_HISTOGRAM";
  })(AggregationType || (AggregationType = {}));
  function toAggregation(option) {
    switch (option.type) {
      case AggregationType.DEFAULT:
        return DEFAULT_AGGREGATION;
      case AggregationType.DROP:
        return DROP_AGGREGATION;
      case AggregationType.SUM:
        return SUM_AGGREGATION;
      case AggregationType.LAST_VALUE:
        return LAST_VALUE_AGGREGATION;
      case AggregationType.EXPONENTIAL_HISTOGRAM: {
        const expOption = option;
        return new ExponentialHistogramAggregation(expOption.options?.maxSize, expOption.options?.recordMinMax);
      }
      case AggregationType.EXPLICIT_BUCKET_HISTOGRAM: {
        const expOption = option;
        if (expOption.options == null) {
          return HISTOGRAM_AGGREGATION;
        } else {
          return new ExplicitBucketHistogramAggregation(expOption.options?.boundaries, expOption.options?.recordMinMax);
        }
      }
      default:
        throw new Error("Unsupported Aggregation");
    }
  }

  // node_modules/@opentelemetry/sdk-metrics/build/esm/export/AggregationSelector.js
  var DEFAULT_AGGREGATION_SELECTOR = (_instrumentType) => {
    return {
      type: AggregationType.DEFAULT
    };
  };
  var DEFAULT_AGGREGATION_TEMPORALITY_SELECTOR = (_instrumentType) => AggregationTemporality.CUMULATIVE;

  // node_modules/@opentelemetry/sdk-metrics/build/esm/export/MetricReader.js
  var MetricReader = class {
    // Tracks the shutdown state.
    // TODO: use BindOncePromise here once a new version of @opentelemetry/core is available.
    _shutdown = false;
    // Additional MetricProducers which will be combined with the SDK's output
    _metricProducers;
    // MetricProducer used by this instance which produces metrics from the SDK
    _sdkMetricProducer;
    _aggregationTemporalitySelector;
    _aggregationSelector;
    _cardinalitySelector;
    constructor(options) {
      this._aggregationSelector = options?.aggregationSelector ?? DEFAULT_AGGREGATION_SELECTOR;
      this._aggregationTemporalitySelector = options?.aggregationTemporalitySelector ?? DEFAULT_AGGREGATION_TEMPORALITY_SELECTOR;
      this._metricProducers = options?.metricProducers ?? [];
      this._cardinalitySelector = options?.cardinalitySelector;
    }
    setMetricProducer(metricProducer) {
      if (this._sdkMetricProducer) {
        throw new Error("MetricReader can not be bound to a MeterProvider again.");
      }
      this._sdkMetricProducer = metricProducer;
      this.onInitialized();
    }
    selectAggregation(instrumentType) {
      return this._aggregationSelector(instrumentType);
    }
    selectAggregationTemporality(instrumentType) {
      return this._aggregationTemporalitySelector(instrumentType);
    }
    selectCardinalityLimit(instrumentType) {
      return this._cardinalitySelector ? this._cardinalitySelector(instrumentType) : 2e3;
    }
    /**
     * Handle once the SDK has initialized this {@link MetricReader}
     * Overriding this method is optional.
     */
    onInitialized() {
    }
    async collect(options) {
      if (this._sdkMetricProducer === void 0) {
        throw new Error("MetricReader is not bound to a MetricProducer");
      }
      if (this._shutdown) {
        throw new Error("MetricReader is shutdown");
      }
      const [sdkCollectionResults, ...additionalCollectionResults] = await Promise.all([
        this._sdkMetricProducer.collect({
          timeoutMillis: options?.timeoutMillis
        }),
        ...this._metricProducers.map((producer) => producer.collect({
          timeoutMillis: options?.timeoutMillis
        }))
      ]);
      const errors = sdkCollectionResults.errors.concat(FlatMap(additionalCollectionResults, (result) => result.errors));
      const resource = sdkCollectionResults.resourceMetrics.resource;
      const scopeMetrics = sdkCollectionResults.resourceMetrics.scopeMetrics.concat(FlatMap(additionalCollectionResults, (result) => result.resourceMetrics.scopeMetrics));
      return {
        resourceMetrics: {
          resource,
          scopeMetrics
        },
        errors
      };
    }
    async shutdown(options) {
      if (this._shutdown) {
        diag2.error("Cannot call shutdown twice.");
        return;
      }
      if (options?.timeoutMillis == null) {
        await this.onShutdown();
      } else {
        await callWithTimeout2(this.onShutdown(), options.timeoutMillis);
      }
      this._shutdown = true;
    }
    async forceFlush(options) {
      if (this._shutdown) {
        diag2.warn("Cannot forceFlush on already shutdown MetricReader.");
        return;
      }
      if (options?.timeoutMillis == null) {
        await this.onForceFlush();
        return;
      }
      await callWithTimeout2(this.onForceFlush(), options.timeoutMillis);
    }
  };

  // node_modules/@opentelemetry/sdk-metrics/build/esm/export/PeriodicExportingMetricReader.js
  var PeriodicExportingMetricReader = class extends MetricReader {
    _interval;
    _exporter;
    _exportInterval;
    _exportTimeout;
    constructor(options) {
      super({
        aggregationSelector: options.exporter.selectAggregation?.bind(options.exporter),
        aggregationTemporalitySelector: options.exporter.selectAggregationTemporality?.bind(options.exporter),
        metricProducers: options.metricProducers
      });
      if (options.exportIntervalMillis !== void 0 && options.exportIntervalMillis <= 0) {
        throw Error("exportIntervalMillis must be greater than 0");
      }
      if (options.exportTimeoutMillis !== void 0 && options.exportTimeoutMillis <= 0) {
        throw Error("exportTimeoutMillis must be greater than 0");
      }
      if (options.exportTimeoutMillis !== void 0 && options.exportIntervalMillis !== void 0 && options.exportIntervalMillis < options.exportTimeoutMillis) {
        throw Error("exportIntervalMillis must be greater than or equal to exportTimeoutMillis");
      }
      this._exportInterval = options.exportIntervalMillis ?? 6e4;
      this._exportTimeout = options.exportTimeoutMillis ?? 3e4;
      this._exporter = options.exporter;
    }
    async _runOnce() {
      try {
        await callWithTimeout2(this._doRun(), this._exportTimeout);
      } catch (err) {
        if (err instanceof TimeoutError2) {
          diag2.error("Export took longer than %s milliseconds and timed out.", this._exportTimeout);
          return;
        }
        globalErrorHandler(err);
      }
    }
    async _doRun() {
      const { resourceMetrics, errors } = await this.collect({
        timeoutMillis: this._exportTimeout
      });
      if (errors.length > 0) {
        diag2.error("PeriodicExportingMetricReader: metrics collection errors", ...errors);
      }
      if (resourceMetrics.resource.asyncAttributesPending) {
        try {
          await resourceMetrics.resource.waitForAsyncAttributes?.();
        } catch (e) {
          diag2.debug("Error while resolving async portion of resource: ", e);
          globalErrorHandler(e);
        }
      }
      if (resourceMetrics.scopeMetrics.length === 0) {
        return;
      }
      const result = await internal._export(this._exporter, resourceMetrics);
      if (result.code !== ExportResultCode.SUCCESS) {
        throw new Error(`PeriodicExportingMetricReader: metrics export failed (error ${result.error})`);
      }
    }
    onInitialized() {
      this._interval = setInterval(() => {
        void this._runOnce();
      }, this._exportInterval);
      if (typeof this._interval !== "number") {
        this._interval.unref();
      }
    }
    async onForceFlush() {
      await this._runOnce();
      await this._exporter.forceFlush();
    }
    async onShutdown() {
      if (this._interval) {
        clearInterval(this._interval);
      }
      await this.onForceFlush();
      await this._exporter.shutdown();
    }
  };

  // node_modules/@opentelemetry/resources/build/esm/platform/browser/default-service-name.js
  function defaultServiceName() {
    return "unknown_service";
  }

  // node_modules/@opentelemetry/resources/build/esm/utils.js
  var isPromiseLike = (val) => {
    return val !== null && typeof val === "object" && typeof val.then === "function";
  };

  // node_modules/@opentelemetry/resources/build/esm/ResourceImpl.js
  var ResourceImpl = class _ResourceImpl {
    _rawAttributes;
    _asyncAttributesPending = false;
    _schemaUrl;
    _memoizedAttributes;
    static FromAttributeList(attributes, options) {
      const res = new _ResourceImpl({}, options);
      res._rawAttributes = guardedRawAttributes(attributes);
      res._asyncAttributesPending = attributes.filter(([_, val]) => isPromiseLike(val)).length > 0;
      return res;
    }
    constructor(resource, options) {
      const attributes = resource.attributes ?? {};
      this._rawAttributes = Object.entries(attributes).map(([k, v]) => {
        if (isPromiseLike(v)) {
          this._asyncAttributesPending = true;
        }
        return [k, v];
      });
      this._rawAttributes = guardedRawAttributes(this._rawAttributes);
      this._schemaUrl = validateSchemaUrl(options?.schemaUrl);
    }
    get asyncAttributesPending() {
      return this._asyncAttributesPending;
    }
    async waitForAsyncAttributes() {
      if (!this.asyncAttributesPending) {
        return;
      }
      for (let i = 0; i < this._rawAttributes.length; i++) {
        const [k, v] = this._rawAttributes[i];
        this._rawAttributes[i] = [k, isPromiseLike(v) ? await v : v];
      }
      this._asyncAttributesPending = false;
    }
    get attributes() {
      if (this.asyncAttributesPending) {
        diag2.error("Accessing resource attributes before async attributes settled");
      }
      if (this._memoizedAttributes) {
        return this._memoizedAttributes;
      }
      const attrs = {};
      for (const [k, v] of this._rawAttributes) {
        if (isPromiseLike(v)) {
          diag2.debug(`Unsettled resource attribute ${k} skipped`);
          continue;
        }
        if (v != null) {
          attrs[k] ??= v;
        }
      }
      if (!this._asyncAttributesPending) {
        this._memoizedAttributes = attrs;
      }
      return attrs;
    }
    getRawAttributes() {
      return this._rawAttributes;
    }
    get schemaUrl() {
      return this._schemaUrl;
    }
    merge(resource) {
      if (resource == null)
        return this;
      const mergedSchemaUrl = mergeSchemaUrl(this, resource);
      const mergedOptions = mergedSchemaUrl ? { schemaUrl: mergedSchemaUrl } : void 0;
      return _ResourceImpl.FromAttributeList([...resource.getRawAttributes(), ...this.getRawAttributes()], mergedOptions);
    }
  };
  function resourceFromAttributes(attributes, options) {
    return ResourceImpl.FromAttributeList(Object.entries(attributes), options);
  }
  function defaultResource() {
    return resourceFromAttributes({
      [ATTR_SERVICE_NAME]: defaultServiceName(),
      [ATTR_TELEMETRY_SDK_LANGUAGE]: SDK_INFO[ATTR_TELEMETRY_SDK_LANGUAGE],
      [ATTR_TELEMETRY_SDK_NAME]: SDK_INFO[ATTR_TELEMETRY_SDK_NAME],
      [ATTR_TELEMETRY_SDK_VERSION]: SDK_INFO[ATTR_TELEMETRY_SDK_VERSION]
    });
  }
  function guardedRawAttributes(attributes) {
    return attributes.map(([k, v]) => {
      if (isPromiseLike(v)) {
        return [
          k,
          v.catch((err) => {
            diag2.debug("promise rejection for resource attribute: %s - %s", k, err);
            return void 0;
          })
        ];
      }
      return [k, v];
    });
  }
  function validateSchemaUrl(schemaUrl) {
    if (typeof schemaUrl === "string" || schemaUrl === void 0) {
      return schemaUrl;
    }
    diag2.warn("Schema URL must be string or undefined, got %s. Schema URL will be ignored.", schemaUrl);
    return void 0;
  }
  function mergeSchemaUrl(old, updating) {
    const oldSchemaUrl = old?.schemaUrl;
    const updatingSchemaUrl = updating?.schemaUrl;
    const isOldEmpty = oldSchemaUrl === void 0 || oldSchemaUrl === "";
    const isUpdatingEmpty = updatingSchemaUrl === void 0 || updatingSchemaUrl === "";
    if (isOldEmpty) {
      return updatingSchemaUrl;
    }
    if (isUpdatingEmpty) {
      return oldSchemaUrl;
    }
    if (oldSchemaUrl === updatingSchemaUrl) {
      return oldSchemaUrl;
    }
    diag2.warn('Schema URL merge conflict: old resource has "%s", updating resource has "%s". Resulting resource will have undefined Schema URL.', oldSchemaUrl, updatingSchemaUrl);
    return void 0;
  }

  // node_modules/@opentelemetry/sdk-metrics/build/esm/view/ViewRegistry.js
  var ViewRegistry = class {
    _registeredViews = [];
    addView(view) {
      this._registeredViews.push(view);
    }
    findViews(instrument, meter) {
      const views = this._registeredViews.filter((registeredView) => {
        return this._matchInstrument(registeredView.instrumentSelector, instrument) && this._matchMeter(registeredView.meterSelector, meter);
      });
      return views;
    }
    _matchInstrument(selector, instrument) {
      return (selector.getType() === void 0 || instrument.type === selector.getType()) && selector.getNameFilter().match(instrument.name) && selector.getUnitFilter().match(instrument.unit);
    }
    _matchMeter(selector, meter) {
      return selector.getNameFilter().match(meter.name) && (meter.version === void 0 || selector.getVersionFilter().match(meter.version)) && (meter.schemaUrl === void 0 || selector.getSchemaUrlFilter().match(meter.schemaUrl));
    }
  };

  // node_modules/@opentelemetry/sdk-metrics/build/esm/InstrumentDescriptor.js
  function createInstrumentDescriptor(name, type, options) {
    if (!isValidName(name)) {
      diag2.warn(`Invalid metric name: "${name}". The metric name should be a ASCII string with a length no greater than 255 characters.`);
    }
    return {
      name,
      type,
      description: options?.description ?? "",
      unit: options?.unit ?? "",
      valueType: options?.valueType ?? ValueType.DOUBLE,
      advice: options?.advice ?? {}
    };
  }
  function createInstrumentDescriptorWithView(view, instrument) {
    return {
      name: view.name ?? instrument.name,
      description: view.description ?? instrument.description,
      type: instrument.type,
      unit: instrument.unit,
      valueType: instrument.valueType,
      advice: instrument.advice
    };
  }
  function isDescriptorCompatibleWith(descriptor, otherDescriptor) {
    return equalsCaseInsensitive(descriptor.name, otherDescriptor.name) && descriptor.unit === otherDescriptor.unit && descriptor.type === otherDescriptor.type && descriptor.valueType === otherDescriptor.valueType;
  }
  var NAME_REGEXP = /^[a-z][a-z0-9_.\-/]{0,254}$/i;
  function isValidName(name) {
    return name.match(NAME_REGEXP) != null;
  }

  // node_modules/@opentelemetry/sdk-metrics/build/esm/Instruments.js
  var SyncInstrument = class {
    _writableMetricStorage;
    _descriptor;
    constructor(_writableMetricStorage, _descriptor) {
      this._writableMetricStorage = _writableMetricStorage;
      this._descriptor = _descriptor;
    }
    _record(value, attributes = {}, context2 = context.active()) {
      if (typeof value !== "number") {
        diag2.warn(`non-number value provided to metric ${this._descriptor.name}: ${value}`);
        return;
      }
      if (this._descriptor.valueType === ValueType.INT && !Number.isInteger(value)) {
        diag2.warn(`INT value type cannot accept a floating-point value for ${this._descriptor.name}, ignoring the fractional digits.`);
        value = Math.trunc(value);
        if (!Number.isInteger(value)) {
          return;
        }
      }
      this._writableMetricStorage.record(value, attributes, context2, millisToHrTime(Date.now()));
    }
  };
  var UpDownCounterInstrument = class extends SyncInstrument {
    /**
     * Increment value of counter by the input. Inputs may be negative.
     */
    add(value, attributes, ctx) {
      this._record(value, attributes, ctx);
    }
  };
  var CounterInstrument = class extends SyncInstrument {
    /**
     * Increment value of counter by the input. Inputs may not be negative.
     */
    add(value, attributes, ctx) {
      if (value < 0) {
        diag2.warn(`negative value provided to counter ${this._descriptor.name}: ${value}`);
        return;
      }
      this._record(value, attributes, ctx);
    }
  };
  var GaugeInstrument = class extends SyncInstrument {
    /**
     * Records a measurement.
     */
    record(value, attributes, ctx) {
      this._record(value, attributes, ctx);
    }
  };
  var HistogramInstrument = class extends SyncInstrument {
    /**
     * Records a measurement. Value of the measurement must not be negative.
     */
    record(value, attributes, ctx) {
      if (value < 0) {
        diag2.warn(`negative value provided to histogram ${this._descriptor.name}: ${value}`);
        return;
      }
      this._record(value, attributes, ctx);
    }
  };
  var ObservableInstrument = class {
    _observableRegistry;
    /** @internal */
    _metricStorages;
    /** @internal */
    _descriptor;
    constructor(descriptor, metricStorages, _observableRegistry) {
      this._observableRegistry = _observableRegistry;
      this._descriptor = descriptor;
      this._metricStorages = metricStorages;
    }
    /**
     * @see {Observable.addCallback}
     */
    addCallback(callback) {
      this._observableRegistry.addCallback(callback, this);
    }
    /**
     * @see {Observable.removeCallback}
     */
    removeCallback(callback) {
      this._observableRegistry.removeCallback(callback, this);
    }
  };
  var ObservableCounterInstrument = class extends ObservableInstrument {
  };
  var ObservableGaugeInstrument = class extends ObservableInstrument {
  };
  var ObservableUpDownCounterInstrument = class extends ObservableInstrument {
  };
  function isObservableInstrument(it) {
    return it instanceof ObservableInstrument;
  }

  // node_modules/@opentelemetry/sdk-metrics/build/esm/Meter.js
  var Meter = class {
    _meterSharedState;
    constructor(_meterSharedState) {
      this._meterSharedState = _meterSharedState;
    }
    /**
     * Create a {@link Gauge} instrument.
     */
    createGauge(name, options) {
      const descriptor = createInstrumentDescriptor(name, InstrumentType.GAUGE, options);
      const storage = this._meterSharedState.registerMetricStorage(descriptor);
      return new GaugeInstrument(storage, descriptor);
    }
    /**
     * Create a {@link Histogram} instrument.
     */
    createHistogram(name, options) {
      const descriptor = createInstrumentDescriptor(name, InstrumentType.HISTOGRAM, options);
      const storage = this._meterSharedState.registerMetricStorage(descriptor);
      return new HistogramInstrument(storage, descriptor);
    }
    /**
     * Create a {@link Counter} instrument.
     */
    createCounter(name, options) {
      const descriptor = createInstrumentDescriptor(name, InstrumentType.COUNTER, options);
      const storage = this._meterSharedState.registerMetricStorage(descriptor);
      return new CounterInstrument(storage, descriptor);
    }
    /**
     * Create a {@link UpDownCounter} instrument.
     */
    createUpDownCounter(name, options) {
      const descriptor = createInstrumentDescriptor(name, InstrumentType.UP_DOWN_COUNTER, options);
      const storage = this._meterSharedState.registerMetricStorage(descriptor);
      return new UpDownCounterInstrument(storage, descriptor);
    }
    /**
     * Create a {@link ObservableGauge} instrument.
     */
    createObservableGauge(name, options) {
      const descriptor = createInstrumentDescriptor(name, InstrumentType.OBSERVABLE_GAUGE, options);
      const storages = this._meterSharedState.registerAsyncMetricStorage(descriptor);
      return new ObservableGaugeInstrument(descriptor, storages, this._meterSharedState.observableRegistry);
    }
    /**
     * Create a {@link ObservableCounter} instrument.
     */
    createObservableCounter(name, options) {
      const descriptor = createInstrumentDescriptor(name, InstrumentType.OBSERVABLE_COUNTER, options);
      const storages = this._meterSharedState.registerAsyncMetricStorage(descriptor);
      return new ObservableCounterInstrument(descriptor, storages, this._meterSharedState.observableRegistry);
    }
    /**
     * Create a {@link ObservableUpDownCounter} instrument.
     */
    createObservableUpDownCounter(name, options) {
      const descriptor = createInstrumentDescriptor(name, InstrumentType.OBSERVABLE_UP_DOWN_COUNTER, options);
      const storages = this._meterSharedState.registerAsyncMetricStorage(descriptor);
      return new ObservableUpDownCounterInstrument(descriptor, storages, this._meterSharedState.observableRegistry);
    }
    /**
     * @see {@link Meter.addBatchObservableCallback}
     */
    addBatchObservableCallback(callback, observables) {
      this._meterSharedState.observableRegistry.addBatchCallback(callback, observables);
    }
    /**
     * @see {@link Meter.removeBatchObservableCallback}
     */
    removeBatchObservableCallback(callback, observables) {
      this._meterSharedState.observableRegistry.removeBatchCallback(callback, observables);
    }
  };

  // node_modules/@opentelemetry/sdk-metrics/build/esm/state/MetricStorage.js
  var MetricStorage = class {
    _instrumentDescriptor;
    constructor(_instrumentDescriptor) {
      this._instrumentDescriptor = _instrumentDescriptor;
    }
    getInstrumentDescriptor() {
      return this._instrumentDescriptor;
    }
    updateDescription(description) {
      this._instrumentDescriptor = createInstrumentDescriptor(this._instrumentDescriptor.name, this._instrumentDescriptor.type, {
        description,
        valueType: this._instrumentDescriptor.valueType,
        unit: this._instrumentDescriptor.unit,
        advice: this._instrumentDescriptor.advice
      });
    }
  };

  // node_modules/@opentelemetry/sdk-metrics/build/esm/state/HashMap.js
  var HashMap = class {
    _hash;
    _valueMap = /* @__PURE__ */ new Map();
    _keyMap = /* @__PURE__ */ new Map();
    constructor(_hash) {
      this._hash = _hash;
    }
    get(key, hashCode) {
      hashCode ??= this._hash(key);
      return this._valueMap.get(hashCode);
    }
    getOrDefault(key, defaultFactory) {
      const hash = this._hash(key);
      if (this._valueMap.has(hash)) {
        return this._valueMap.get(hash);
      }
      const val = defaultFactory();
      if (!this._keyMap.has(hash)) {
        this._keyMap.set(hash, key);
      }
      this._valueMap.set(hash, val);
      return val;
    }
    set(key, value, hashCode) {
      hashCode ??= this._hash(key);
      if (!this._keyMap.has(hashCode)) {
        this._keyMap.set(hashCode, key);
      }
      this._valueMap.set(hashCode, value);
    }
    has(key, hashCode) {
      hashCode ??= this._hash(key);
      return this._valueMap.has(hashCode);
    }
    *keys() {
      const keyIterator = this._keyMap.entries();
      let next = keyIterator.next();
      while (next.done !== true) {
        yield [next.value[1], next.value[0]];
        next = keyIterator.next();
      }
    }
    *entries() {
      const valueIterator = this._valueMap.entries();
      let next = valueIterator.next();
      while (next.done !== true) {
        yield [this._keyMap.get(next.value[0]), next.value[1], next.value[0]];
        next = valueIterator.next();
      }
    }
    get size() {
      return this._valueMap.size;
    }
  };
  var AttributeHashMap = class extends HashMap {
    constructor() {
      super(hashAttributes);
    }
  };

  // node_modules/@opentelemetry/sdk-metrics/build/esm/state/DeltaMetricProcessor.js
  var DeltaMetricProcessor = class {
    _aggregator;
    _activeCollectionStorage = new AttributeHashMap();
    // TODO: find a reasonable mean to clean the memo;
    // https://github.com/open-telemetry/opentelemetry-specification/pull/2208
    _cumulativeMemoStorage = new AttributeHashMap();
    _cardinalityLimit;
    _overflowAttributes = { "otel.metric.overflow": true };
    _overflowHashCode;
    constructor(_aggregator, aggregationCardinalityLimit) {
      this._aggregator = _aggregator;
      this._cardinalityLimit = (aggregationCardinalityLimit ?? 2e3) - 1;
      this._overflowHashCode = hashAttributes(this._overflowAttributes);
    }
    record(value, attributes, _context, collectionTime) {
      let accumulation = this._activeCollectionStorage.get(attributes);
      if (!accumulation) {
        if (this._activeCollectionStorage.size >= this._cardinalityLimit) {
          const overflowAccumulation = this._activeCollectionStorage.getOrDefault(this._overflowAttributes, () => this._aggregator.createAccumulation(collectionTime));
          overflowAccumulation?.record(value);
          return;
        }
        accumulation = this._aggregator.createAccumulation(collectionTime);
        this._activeCollectionStorage.set(attributes, accumulation);
      }
      accumulation?.record(value);
    }
    batchCumulate(measurements, collectionTime) {
      Array.from(measurements.entries()).forEach(([attributes, value, hashCode]) => {
        const accumulation = this._aggregator.createAccumulation(collectionTime);
        accumulation?.record(value);
        let delta = accumulation;
        if (this._cumulativeMemoStorage.has(attributes, hashCode)) {
          const previous = this._cumulativeMemoStorage.get(attributes, hashCode);
          delta = this._aggregator.diff(previous, accumulation);
        } else {
          if (this._cumulativeMemoStorage.size >= this._cardinalityLimit) {
            attributes = this._overflowAttributes;
            hashCode = this._overflowHashCode;
            if (this._cumulativeMemoStorage.has(attributes, hashCode)) {
              const previous = this._cumulativeMemoStorage.get(attributes, hashCode);
              delta = this._aggregator.diff(previous, accumulation);
            }
          }
        }
        if (this._activeCollectionStorage.has(attributes, hashCode)) {
          const active = this._activeCollectionStorage.get(attributes, hashCode);
          delta = this._aggregator.merge(active, delta);
        }
        this._cumulativeMemoStorage.set(attributes, accumulation, hashCode);
        this._activeCollectionStorage.set(attributes, delta, hashCode);
      });
    }
    /**
     * Returns a collection of delta metrics. Start time is the when first
     * time event collected.
     */
    collect() {
      const unreportedDelta = this._activeCollectionStorage;
      this._activeCollectionStorage = new AttributeHashMap();
      return unreportedDelta;
    }
  };

  // node_modules/@opentelemetry/sdk-metrics/build/esm/state/TemporalMetricProcessor.js
  var TemporalMetricProcessor = class _TemporalMetricProcessor {
    _aggregator;
    _unreportedAccumulations = /* @__PURE__ */ new Map();
    _reportHistory = /* @__PURE__ */ new Map();
    constructor(_aggregator, collectorHandles) {
      this._aggregator = _aggregator;
      collectorHandles.forEach((handle) => {
        this._unreportedAccumulations.set(handle, []);
      });
    }
    /**
     * Builds the {@link MetricData} streams to report against a specific MetricCollector.
     * @param collector The information of the MetricCollector.
     * @param collectors The registered collectors.
     * @param instrumentDescriptor The instrumentation descriptor that these metrics generated with.
     * @param currentAccumulations The current accumulation of metric data from instruments.
     * @param collectionTime The current collection timestamp.
     * @returns The {@link MetricData} points or `null`.
     */
    buildMetrics(collector, instrumentDescriptor, currentAccumulations, collectionTime) {
      this._stashAccumulations(currentAccumulations);
      const unreportedAccumulations = this._getMergedUnreportedAccumulations(collector);
      let result = unreportedAccumulations;
      let aggregationTemporality;
      if (this._reportHistory.has(collector)) {
        const last = this._reportHistory.get(collector);
        const lastCollectionTime = last.collectionTime;
        aggregationTemporality = last.aggregationTemporality;
        if (aggregationTemporality === AggregationTemporality.CUMULATIVE) {
          result = _TemporalMetricProcessor.merge(last.accumulations, unreportedAccumulations, this._aggregator);
        } else {
          result = _TemporalMetricProcessor.calibrateStartTime(last.accumulations, unreportedAccumulations, lastCollectionTime);
        }
      } else {
        aggregationTemporality = collector.selectAggregationTemporality(instrumentDescriptor.type);
      }
      this._reportHistory.set(collector, {
        accumulations: result,
        collectionTime,
        aggregationTemporality
      });
      const accumulationRecords = AttributesMapToAccumulationRecords(result);
      if (accumulationRecords.length === 0) {
        return void 0;
      }
      return this._aggregator.toMetricData(
        instrumentDescriptor,
        aggregationTemporality,
        accumulationRecords,
        /* endTime */
        collectionTime
      );
    }
    _stashAccumulations(currentAccumulation) {
      const registeredCollectors = this._unreportedAccumulations.keys();
      for (const collector of registeredCollectors) {
        let stash = this._unreportedAccumulations.get(collector);
        if (stash === void 0) {
          stash = [];
          this._unreportedAccumulations.set(collector, stash);
        }
        stash.push(currentAccumulation);
      }
    }
    _getMergedUnreportedAccumulations(collector) {
      let result = new AttributeHashMap();
      const unreportedList = this._unreportedAccumulations.get(collector);
      this._unreportedAccumulations.set(collector, []);
      if (unreportedList === void 0) {
        return result;
      }
      for (const it of unreportedList) {
        result = _TemporalMetricProcessor.merge(result, it, this._aggregator);
      }
      return result;
    }
    static merge(last, current, aggregator) {
      const result = last;
      const iterator = current.entries();
      let next = iterator.next();
      while (next.done !== true) {
        const [key, record, hash] = next.value;
        if (last.has(key, hash)) {
          const lastAccumulation = last.get(key, hash);
          const accumulation = aggregator.merge(lastAccumulation, record);
          result.set(key, accumulation, hash);
        } else {
          result.set(key, record, hash);
        }
        next = iterator.next();
      }
      return result;
    }
    /**
     * Calibrate the reported metric streams' startTime to lastCollectionTime. Leaves
     * the new stream to be the initial observation time unchanged.
     */
    static calibrateStartTime(last, current, lastCollectionTime) {
      for (const [key, hash] of last.keys()) {
        const currentAccumulation = current.get(key, hash);
        currentAccumulation?.setStartTime(lastCollectionTime);
      }
      return current;
    }
  };
  function AttributesMapToAccumulationRecords(map) {
    return Array.from(map.entries());
  }

  // node_modules/@opentelemetry/sdk-metrics/build/esm/state/AsyncMetricStorage.js
  var AsyncMetricStorage = class extends MetricStorage {
    _attributesProcessor;
    _aggregationCardinalityLimit;
    _deltaMetricStorage;
    _temporalMetricStorage;
    constructor(_instrumentDescriptor, aggregator, _attributesProcessor, collectorHandles, _aggregationCardinalityLimit) {
      super(_instrumentDescriptor);
      this._attributesProcessor = _attributesProcessor;
      this._aggregationCardinalityLimit = _aggregationCardinalityLimit;
      this._deltaMetricStorage = new DeltaMetricProcessor(aggregator, this._aggregationCardinalityLimit);
      this._temporalMetricStorage = new TemporalMetricProcessor(aggregator, collectorHandles);
    }
    record(measurements, observationTime) {
      const processed = new AttributeHashMap();
      Array.from(measurements.entries()).forEach(([attributes, value]) => {
        processed.set(this._attributesProcessor.process(attributes), value);
      });
      this._deltaMetricStorage.batchCumulate(processed, observationTime);
    }
    /**
     * Collects the metrics from this storage. The ObservableCallback is invoked
     * during the collection.
     *
     * Note: This is a stateful operation and may reset any interval-related
     * state for the MetricCollector.
     */
    collect(collector, collectionTime) {
      const accumulations = this._deltaMetricStorage.collect();
      return this._temporalMetricStorage.buildMetrics(collector, this._instrumentDescriptor, accumulations, collectionTime);
    }
  };

  // node_modules/@opentelemetry/sdk-metrics/build/esm/view/RegistrationConflicts.js
  function getIncompatibilityDetails(existing, otherDescriptor) {
    let incompatibility = "";
    if (existing.unit !== otherDescriptor.unit) {
      incompatibility += `	- Unit '${existing.unit}' does not match '${otherDescriptor.unit}'
`;
    }
    if (existing.type !== otherDescriptor.type) {
      incompatibility += `	- Type '${existing.type}' does not match '${otherDescriptor.type}'
`;
    }
    if (existing.valueType !== otherDescriptor.valueType) {
      incompatibility += `	- Value Type '${existing.valueType}' does not match '${otherDescriptor.valueType}'
`;
    }
    if (existing.description !== otherDescriptor.description) {
      incompatibility += `	- Description '${existing.description}' does not match '${otherDescriptor.description}'
`;
    }
    return incompatibility;
  }
  function getValueTypeConflictResolutionRecipe(existing, otherDescriptor) {
    return `	- use valueType '${existing.valueType}' on instrument creation or use an instrument name other than '${otherDescriptor.name}'`;
  }
  function getUnitConflictResolutionRecipe(existing, otherDescriptor) {
    return `	- use unit '${existing.unit}' on instrument creation or use an instrument name other than '${otherDescriptor.name}'`;
  }
  function getTypeConflictResolutionRecipe(existing, otherDescriptor) {
    const selector = {
      name: otherDescriptor.name,
      type: otherDescriptor.type,
      unit: otherDescriptor.unit
    };
    const selectorString = JSON.stringify(selector);
    return `	- create a new view with a name other than '${existing.name}' and InstrumentSelector '${selectorString}'`;
  }
  function getDescriptionResolutionRecipe(existing, otherDescriptor) {
    const selector = {
      name: otherDescriptor.name,
      type: otherDescriptor.type,
      unit: otherDescriptor.unit
    };
    const selectorString = JSON.stringify(selector);
    return `	- create a new view with a name other than '${existing.name}' and InstrumentSelector '${selectorString}'
    	- OR - create a new view with the name ${existing.name} and description '${existing.description}' and InstrumentSelector ${selectorString}
    	- OR - create a new view with the name ${otherDescriptor.name} and description '${existing.description}' and InstrumentSelector ${selectorString}`;
  }
  function getConflictResolutionRecipe(existing, otherDescriptor) {
    if (existing.valueType !== otherDescriptor.valueType) {
      return getValueTypeConflictResolutionRecipe(existing, otherDescriptor);
    }
    if (existing.unit !== otherDescriptor.unit) {
      return getUnitConflictResolutionRecipe(existing, otherDescriptor);
    }
    if (existing.type !== otherDescriptor.type) {
      return getTypeConflictResolutionRecipe(existing, otherDescriptor);
    }
    if (existing.description !== otherDescriptor.description) {
      return getDescriptionResolutionRecipe(existing, otherDescriptor);
    }
    return "";
  }

  // node_modules/@opentelemetry/sdk-metrics/build/esm/state/MetricStorageRegistry.js
  var MetricStorageRegistry = class _MetricStorageRegistry {
    _sharedRegistry = /* @__PURE__ */ new Map();
    _perCollectorRegistry = /* @__PURE__ */ new Map();
    static create() {
      return new _MetricStorageRegistry();
    }
    getStorages(collector) {
      let storages = [];
      for (const metricStorages of this._sharedRegistry.values()) {
        storages = storages.concat(metricStorages);
      }
      const perCollectorStorages = this._perCollectorRegistry.get(collector);
      if (perCollectorStorages != null) {
        for (const metricStorages of perCollectorStorages.values()) {
          storages = storages.concat(metricStorages);
        }
      }
      return storages;
    }
    register(storage) {
      this._registerStorage(storage, this._sharedRegistry);
    }
    registerForCollector(collector, storage) {
      let storageMap = this._perCollectorRegistry.get(collector);
      if (storageMap == null) {
        storageMap = /* @__PURE__ */ new Map();
        this._perCollectorRegistry.set(collector, storageMap);
      }
      this._registerStorage(storage, storageMap);
    }
    findOrUpdateCompatibleStorage(expectedDescriptor) {
      const storages = this._sharedRegistry.get(expectedDescriptor.name);
      if (storages === void 0) {
        return null;
      }
      return this._findOrUpdateCompatibleStorage(expectedDescriptor, storages);
    }
    findOrUpdateCompatibleCollectorStorage(collector, expectedDescriptor) {
      const storageMap = this._perCollectorRegistry.get(collector);
      if (storageMap === void 0) {
        return null;
      }
      const storages = storageMap.get(expectedDescriptor.name);
      if (storages === void 0) {
        return null;
      }
      return this._findOrUpdateCompatibleStorage(expectedDescriptor, storages);
    }
    _registerStorage(storage, storageMap) {
      const descriptor = storage.getInstrumentDescriptor();
      const storages = storageMap.get(descriptor.name);
      if (storages === void 0) {
        storageMap.set(descriptor.name, [storage]);
        return;
      }
      storages.push(storage);
    }
    _findOrUpdateCompatibleStorage(expectedDescriptor, existingStorages) {
      let compatibleStorage = null;
      for (const existingStorage of existingStorages) {
        const existingDescriptor = existingStorage.getInstrumentDescriptor();
        if (isDescriptorCompatibleWith(existingDescriptor, expectedDescriptor)) {
          if (existingDescriptor.description !== expectedDescriptor.description) {
            if (expectedDescriptor.description.length > existingDescriptor.description.length) {
              existingStorage.updateDescription(expectedDescriptor.description);
            }
            diag2.warn("A view or instrument with the name ", expectedDescriptor.name, " has already been registered, but has a different description and is incompatible with another registered view.\n", "Details:\n", getIncompatibilityDetails(existingDescriptor, expectedDescriptor), "The longer description will be used.\nTo resolve the conflict:", getConflictResolutionRecipe(existingDescriptor, expectedDescriptor));
          }
          compatibleStorage = existingStorage;
        } else {
          diag2.warn("A view or instrument with the name ", expectedDescriptor.name, " has already been registered and is incompatible with another registered view.\n", "Details:\n", getIncompatibilityDetails(existingDescriptor, expectedDescriptor), "To resolve the conflict:\n", getConflictResolutionRecipe(existingDescriptor, expectedDescriptor));
        }
      }
      return compatibleStorage;
    }
  };

  // node_modules/@opentelemetry/sdk-metrics/build/esm/state/MultiWritableMetricStorage.js
  var MultiMetricStorage = class {
    _backingStorages;
    constructor(_backingStorages) {
      this._backingStorages = _backingStorages;
    }
    record(value, attributes, context2, recordTime) {
      this._backingStorages.forEach((it) => {
        it.record(value, attributes, context2, recordTime);
      });
    }
  };

  // node_modules/@opentelemetry/sdk-metrics/build/esm/ObservableResult.js
  var ObservableResultImpl = class {
    _instrumentName;
    _valueType;
    /**
     * @internal
     */
    _buffer = new AttributeHashMap();
    constructor(_instrumentName, _valueType) {
      this._instrumentName = _instrumentName;
      this._valueType = _valueType;
    }
    /**
     * Observe a measurement of the value associated with the given attributes.
     */
    observe(value, attributes = {}) {
      if (typeof value !== "number") {
        diag2.warn(`non-number value provided to metric ${this._instrumentName}: ${value}`);
        return;
      }
      if (this._valueType === ValueType.INT && !Number.isInteger(value)) {
        diag2.warn(`INT value type cannot accept a floating-point value for ${this._instrumentName}, ignoring the fractional digits.`);
        value = Math.trunc(value);
        if (!Number.isInteger(value)) {
          return;
        }
      }
      this._buffer.set(attributes, value);
    }
  };
  var BatchObservableResultImpl = class {
    /**
     * @internal
     */
    _buffer = /* @__PURE__ */ new Map();
    /**
     * Observe a measurement of the value associated with the given attributes.
     */
    observe(metric, value, attributes = {}) {
      if (!isObservableInstrument(metric)) {
        return;
      }
      let map = this._buffer.get(metric);
      if (map == null) {
        map = new AttributeHashMap();
        this._buffer.set(metric, map);
      }
      if (typeof value !== "number") {
        diag2.warn(`non-number value provided to metric ${metric._descriptor.name}: ${value}`);
        return;
      }
      if (metric._descriptor.valueType === ValueType.INT && !Number.isInteger(value)) {
        diag2.warn(`INT value type cannot accept a floating-point value for ${metric._descriptor.name}, ignoring the fractional digits.`);
        value = Math.trunc(value);
        if (!Number.isInteger(value)) {
          return;
        }
      }
      map.set(attributes, value);
    }
  };

  // node_modules/@opentelemetry/sdk-metrics/build/esm/state/ObservableRegistry.js
  var ObservableRegistry = class {
    _callbacks = [];
    _batchCallbacks = [];
    addCallback(callback, instrument) {
      const idx = this._findCallback(callback, instrument);
      if (idx >= 0) {
        return;
      }
      this._callbacks.push({ callback, instrument });
    }
    removeCallback(callback, instrument) {
      const idx = this._findCallback(callback, instrument);
      if (idx < 0) {
        return;
      }
      this._callbacks.splice(idx, 1);
    }
    addBatchCallback(callback, instruments) {
      const observableInstruments = new Set(instruments.filter(isObservableInstrument));
      if (observableInstruments.size === 0) {
        diag2.error("BatchObservableCallback is not associated with valid instruments", instruments);
        return;
      }
      const idx = this._findBatchCallback(callback, observableInstruments);
      if (idx >= 0) {
        return;
      }
      this._batchCallbacks.push({ callback, instruments: observableInstruments });
    }
    removeBatchCallback(callback, instruments) {
      const observableInstruments = new Set(instruments.filter(isObservableInstrument));
      const idx = this._findBatchCallback(callback, observableInstruments);
      if (idx < 0) {
        return;
      }
      this._batchCallbacks.splice(idx, 1);
    }
    /**
     * @returns a promise of rejected reasons for invoking callbacks.
     */
    async observe(collectionTime, timeoutMillis) {
      const callbackFutures = this._observeCallbacks(collectionTime, timeoutMillis);
      const batchCallbackFutures = this._observeBatchCallbacks(collectionTime, timeoutMillis);
      const results = await PromiseAllSettled([
        ...callbackFutures,
        ...batchCallbackFutures
      ]);
      const rejections = results.filter(isPromiseAllSettledRejectionResult).map((it) => it.reason);
      return rejections;
    }
    _observeCallbacks(observationTime, timeoutMillis) {
      return this._callbacks.map(async ({ callback, instrument }) => {
        const observableResult = new ObservableResultImpl(instrument._descriptor.name, instrument._descriptor.valueType);
        let callPromise = Promise.resolve(callback(observableResult));
        if (timeoutMillis != null) {
          callPromise = callWithTimeout2(callPromise, timeoutMillis);
        }
        await callPromise;
        instrument._metricStorages.forEach((metricStorage) => {
          metricStorage.record(observableResult._buffer, observationTime);
        });
      });
    }
    _observeBatchCallbacks(observationTime, timeoutMillis) {
      return this._batchCallbacks.map(async ({ callback, instruments }) => {
        const observableResult = new BatchObservableResultImpl();
        let callPromise = Promise.resolve(callback(observableResult));
        if (timeoutMillis != null) {
          callPromise = callWithTimeout2(callPromise, timeoutMillis);
        }
        await callPromise;
        instruments.forEach((instrument) => {
          const buffer = observableResult._buffer.get(instrument);
          if (buffer == null) {
            return;
          }
          instrument._metricStorages.forEach((metricStorage) => {
            metricStorage.record(buffer, observationTime);
          });
        });
      });
    }
    _findCallback(callback, instrument) {
      return this._callbacks.findIndex((record) => {
        return record.callback === callback && record.instrument === instrument;
      });
    }
    _findBatchCallback(callback, instruments) {
      return this._batchCallbacks.findIndex((record) => {
        return record.callback === callback && setEquals(record.instruments, instruments);
      });
    }
  };

  // node_modules/@opentelemetry/sdk-metrics/build/esm/state/SyncMetricStorage.js
  var SyncMetricStorage = class extends MetricStorage {
    _attributesProcessor;
    _aggregationCardinalityLimit;
    _deltaMetricStorage;
    _temporalMetricStorage;
    constructor(instrumentDescriptor, aggregator, _attributesProcessor, collectorHandles, _aggregationCardinalityLimit) {
      super(instrumentDescriptor);
      this._attributesProcessor = _attributesProcessor;
      this._aggregationCardinalityLimit = _aggregationCardinalityLimit;
      this._deltaMetricStorage = new DeltaMetricProcessor(aggregator, this._aggregationCardinalityLimit);
      this._temporalMetricStorage = new TemporalMetricProcessor(aggregator, collectorHandles);
    }
    record(value, attributes, context2, recordTime) {
      attributes = this._attributesProcessor.process(attributes, context2);
      this._deltaMetricStorage.record(value, attributes, context2, recordTime);
    }
    /**
     * Collects the metrics from this storage.
     *
     * Note: This is a stateful operation and may reset any interval-related
     * state for the MetricCollector.
     */
    collect(collector, collectionTime) {
      const accumulations = this._deltaMetricStorage.collect();
      return this._temporalMetricStorage.buildMetrics(collector, this._instrumentDescriptor, accumulations, collectionTime);
    }
  };

  // node_modules/@opentelemetry/sdk-metrics/build/esm/view/AttributesProcessor.js
  var NoopAttributesProcessor = class {
    process(incoming, _context) {
      return incoming;
    }
  };
  var MultiAttributesProcessor = class {
    _processors;
    constructor(_processors) {
      this._processors = _processors;
    }
    process(incoming, context2) {
      let filteredAttributes = incoming;
      for (const processor of this._processors) {
        filteredAttributes = processor.process(filteredAttributes, context2);
      }
      return filteredAttributes;
    }
  };
  function createNoopAttributesProcessor() {
    return NOOP;
  }
  function createMultiAttributesProcessor(processors) {
    return new MultiAttributesProcessor(processors);
  }
  var NOOP = new NoopAttributesProcessor();

  // node_modules/@opentelemetry/sdk-metrics/build/esm/state/MeterSharedState.js
  var MeterSharedState = class {
    _meterProviderSharedState;
    _instrumentationScope;
    metricStorageRegistry = new MetricStorageRegistry();
    observableRegistry = new ObservableRegistry();
    meter;
    constructor(_meterProviderSharedState, _instrumentationScope) {
      this._meterProviderSharedState = _meterProviderSharedState;
      this._instrumentationScope = _instrumentationScope;
      this.meter = new Meter(this);
    }
    registerMetricStorage(descriptor) {
      const storages = this._registerMetricStorage(descriptor, SyncMetricStorage);
      if (storages.length === 1) {
        return storages[0];
      }
      return new MultiMetricStorage(storages);
    }
    registerAsyncMetricStorage(descriptor) {
      const storages = this._registerMetricStorage(descriptor, AsyncMetricStorage);
      return storages;
    }
    /**
     * @param collector opaque handle of {@link MetricCollector} which initiated the collection.
     * @param collectionTime the HrTime at which the collection was initiated.
     * @param options options for collection.
     * @returns the list of metric data collected.
     */
    async collect(collector, collectionTime, options) {
      const errors = await this.observableRegistry.observe(collectionTime, options?.timeoutMillis);
      const storages = this.metricStorageRegistry.getStorages(collector);
      if (storages.length === 0) {
        return null;
      }
      const metricDataList = storages.map((metricStorage) => {
        return metricStorage.collect(collector, collectionTime);
      }).filter(isNotNullish);
      if (metricDataList.length === 0) {
        return { errors };
      }
      return {
        scopeMetrics: {
          scope: this._instrumentationScope,
          metrics: metricDataList
        },
        errors
      };
    }
    _registerMetricStorage(descriptor, MetricStorageType) {
      const views = this._meterProviderSharedState.viewRegistry.findViews(descriptor, this._instrumentationScope);
      let storages = views.map((view) => {
        const viewDescriptor = createInstrumentDescriptorWithView(view, descriptor);
        const compatibleStorage = this.metricStorageRegistry.findOrUpdateCompatibleStorage(viewDescriptor);
        if (compatibleStorage != null) {
          return compatibleStorage;
        }
        const aggregator = view.aggregation.createAggregator(viewDescriptor);
        const viewStorage = new MetricStorageType(viewDescriptor, aggregator, view.attributesProcessor, this._meterProviderSharedState.metricCollectors, view.aggregationCardinalityLimit);
        this.metricStorageRegistry.register(viewStorage);
        return viewStorage;
      });
      if (storages.length === 0) {
        const perCollectorAggregations = this._meterProviderSharedState.selectAggregations(descriptor.type);
        const collectorStorages = perCollectorAggregations.map(([collector, aggregation]) => {
          const compatibleStorage = this.metricStorageRegistry.findOrUpdateCompatibleCollectorStorage(collector, descriptor);
          if (compatibleStorage != null) {
            return compatibleStorage;
          }
          const aggregator = aggregation.createAggregator(descriptor);
          const cardinalityLimit = collector.selectCardinalityLimit(descriptor.type);
          const storage = new MetricStorageType(descriptor, aggregator, createNoopAttributesProcessor(), [collector], cardinalityLimit);
          this.metricStorageRegistry.registerForCollector(collector, storage);
          return storage;
        });
        storages = storages.concat(collectorStorages);
      }
      return storages;
    }
  };

  // node_modules/@opentelemetry/sdk-metrics/build/esm/state/MeterProviderSharedState.js
  var MeterProviderSharedState = class {
    resource;
    viewRegistry = new ViewRegistry();
    metricCollectors = [];
    meterSharedStates = /* @__PURE__ */ new Map();
    constructor(resource) {
      this.resource = resource;
    }
    getMeterSharedState(instrumentationScope) {
      const id = instrumentationScopeId(instrumentationScope);
      let meterSharedState = this.meterSharedStates.get(id);
      if (meterSharedState == null) {
        meterSharedState = new MeterSharedState(this, instrumentationScope);
        this.meterSharedStates.set(id, meterSharedState);
      }
      return meterSharedState;
    }
    selectAggregations(instrumentType) {
      const result = [];
      for (const collector of this.metricCollectors) {
        result.push([
          collector,
          toAggregation(collector.selectAggregation(instrumentType))
        ]);
      }
      return result;
    }
  };

  // node_modules/@opentelemetry/sdk-metrics/build/esm/state/MetricCollector.js
  var MetricCollector = class {
    _sharedState;
    _metricReader;
    constructor(_sharedState, _metricReader) {
      this._sharedState = _sharedState;
      this._metricReader = _metricReader;
    }
    async collect(options) {
      const collectionTime = millisToHrTime(Date.now());
      const scopeMetrics = [];
      const errors = [];
      const meterCollectionPromises = Array.from(this._sharedState.meterSharedStates.values()).map(async (meterSharedState) => {
        const current = await meterSharedState.collect(this, collectionTime, options);
        if (current?.scopeMetrics != null) {
          scopeMetrics.push(current.scopeMetrics);
        }
        if (current?.errors != null) {
          errors.push(...current.errors);
        }
      });
      await Promise.all(meterCollectionPromises);
      return {
        resourceMetrics: {
          resource: this._sharedState.resource,
          scopeMetrics
        },
        errors
      };
    }
    /**
     * Delegates for MetricReader.forceFlush.
     */
    async forceFlush(options) {
      await this._metricReader.forceFlush(options);
    }
    /**
     * Delegates for MetricReader.shutdown.
     */
    async shutdown(options) {
      await this._metricReader.shutdown(options);
    }
    selectAggregationTemporality(instrumentType) {
      return this._metricReader.selectAggregationTemporality(instrumentType);
    }
    selectAggregation(instrumentType) {
      return this._metricReader.selectAggregation(instrumentType);
    }
    /**
     * Select the cardinality limit for the given {@link InstrumentType} for this
     * collector.
     */
    selectCardinalityLimit(instrumentType) {
      return this._metricReader.selectCardinalityLimit?.(instrumentType) ?? 2e3;
    }
  };

  // node_modules/@opentelemetry/sdk-metrics/build/esm/view/Predicate.js
  var ESCAPE = /[\^$\\.+?()[\]{}|]/g;
  var PatternPredicate = class _PatternPredicate {
    _matchAll;
    _regexp;
    constructor(pattern) {
      if (pattern === "*") {
        this._matchAll = true;
        this._regexp = /.*/;
      } else {
        this._matchAll = false;
        this._regexp = new RegExp(_PatternPredicate.escapePattern(pattern));
      }
    }
    match(str) {
      if (this._matchAll) {
        return true;
      }
      return this._regexp.test(str);
    }
    static escapePattern(pattern) {
      return `^${pattern.replace(ESCAPE, "\\$&").replace("*", ".*")}$`;
    }
    static hasWildcard(pattern) {
      return pattern.includes("*");
    }
  };
  var ExactPredicate = class {
    _matchAll;
    _pattern;
    constructor(pattern) {
      this._matchAll = pattern === void 0;
      this._pattern = pattern;
    }
    match(str) {
      if (this._matchAll) {
        return true;
      }
      if (str === this._pattern) {
        return true;
      }
      return false;
    }
  };

  // node_modules/@opentelemetry/sdk-metrics/build/esm/view/InstrumentSelector.js
  var InstrumentSelector = class {
    _nameFilter;
    _type;
    _unitFilter;
    constructor(criteria) {
      this._nameFilter = new PatternPredicate(criteria?.name ?? "*");
      this._type = criteria?.type;
      this._unitFilter = new ExactPredicate(criteria?.unit);
    }
    getType() {
      return this._type;
    }
    getNameFilter() {
      return this._nameFilter;
    }
    getUnitFilter() {
      return this._unitFilter;
    }
  };

  // node_modules/@opentelemetry/sdk-metrics/build/esm/view/MeterSelector.js
  var MeterSelector = class {
    _nameFilter;
    _versionFilter;
    _schemaUrlFilter;
    constructor(criteria) {
      this._nameFilter = new ExactPredicate(criteria?.name);
      this._versionFilter = new ExactPredicate(criteria?.version);
      this._schemaUrlFilter = new ExactPredicate(criteria?.schemaUrl);
    }
    getNameFilter() {
      return this._nameFilter;
    }
    /**
     * TODO: semver filter? no spec yet.
     */
    getVersionFilter() {
      return this._versionFilter;
    }
    getSchemaUrlFilter() {
      return this._schemaUrlFilter;
    }
  };

  // node_modules/@opentelemetry/sdk-metrics/build/esm/view/View.js
  function isSelectorNotProvided(options) {
    return options.instrumentName == null && options.instrumentType == null && options.instrumentUnit == null && options.meterName == null && options.meterVersion == null && options.meterSchemaUrl == null;
  }
  function validateViewOptions(viewOptions) {
    if (isSelectorNotProvided(viewOptions)) {
      throw new Error("Cannot create view with no selector arguments supplied");
    }
    if (viewOptions.name != null && (viewOptions?.instrumentName == null || PatternPredicate.hasWildcard(viewOptions.instrumentName))) {
      throw new Error("Views with a specified name must be declared with an instrument selector that selects at most one instrument per meter.");
    }
  }
  var View = class {
    name;
    description;
    aggregation;
    attributesProcessor;
    instrumentSelector;
    meterSelector;
    aggregationCardinalityLimit;
    /**
     * Create a new {@link View} instance.
     *
     * Parameters can be categorized as two types:
     *  Instrument selection criteria: Used to describe the instrument(s) this view will be applied to.
     *  Will be treated as additive (the Instrument has to meet all the provided criteria to be selected).
     *
     *  Metric stream altering: Alter the metric stream of instruments selected by instrument selection criteria.
     *
     * @param viewOptions {@link ViewOptions} for altering the metric stream and instrument selection.
     * @param viewOptions.name
     * Alters the metric stream:
     *  This will be used as the name of the metrics stream.
     *  If not provided, the original Instrument name will be used.
     * @param viewOptions.description
     * Alters the metric stream:
     *  This will be used as the description of the metrics stream.
     *  If not provided, the original Instrument description will be used by default.
     * @param viewOptions.attributesProcessors
     * Alters the metric stream:
     *  If provided, the attributes will be modified as defined by the added processors.
     *  If not provided, all attribute keys will be used by default.
     * @param viewOptions.aggregationCardinalityLimit
     * Alters the metric stream:
     *  Sets a limit on the number of unique attribute combinations (cardinality) that can be aggregated.
     *  If not provided, the default limit of 2000 will be used.
     * @param viewOptions.aggregation
     * Alters the metric stream:
     *  Alters the {@link Aggregation} of the metric stream.
     * @param viewOptions.instrumentName
     * Instrument selection criteria:
     *  Original name of the Instrument(s) with wildcard support.
     * @param viewOptions.instrumentType
     * Instrument selection criteria:
     *  The original type of the Instrument(s).
     * @param viewOptions.instrumentUnit
     * Instrument selection criteria:
     *  The unit of the Instrument(s).
     * @param viewOptions.meterName
     * Instrument selection criteria:
     *  The name of the Meter. No wildcard support, name must match the meter exactly.
     * @param viewOptions.meterVersion
     * Instrument selection criteria:
     *  The version of the Meter. No wildcard support, version must match exactly.
     * @param viewOptions.meterSchemaUrl
     * Instrument selection criteria:
     *  The schema URL of the Meter. No wildcard support, schema URL must match exactly.
     *
     * @example
     * // Create a view that changes the Instrument 'my.instrument' to use to an
     * // ExplicitBucketHistogramAggregation with the boundaries [20, 30, 40]
     * new View({
     *   aggregation: new ExplicitBucketHistogramAggregation([20, 30, 40]),
     *   instrumentName: 'my.instrument'
     * })
     */
    constructor(viewOptions) {
      validateViewOptions(viewOptions);
      if (viewOptions.attributesProcessors != null) {
        this.attributesProcessor = createMultiAttributesProcessor(viewOptions.attributesProcessors);
      } else {
        this.attributesProcessor = createNoopAttributesProcessor();
      }
      this.name = viewOptions.name;
      this.description = viewOptions.description;
      this.aggregation = toAggregation(viewOptions.aggregation ?? { type: AggregationType.DEFAULT });
      this.instrumentSelector = new InstrumentSelector({
        name: viewOptions.instrumentName,
        type: viewOptions.instrumentType,
        unit: viewOptions.instrumentUnit
      });
      this.meterSelector = new MeterSelector({
        name: viewOptions.meterName,
        version: viewOptions.meterVersion,
        schemaUrl: viewOptions.meterSchemaUrl
      });
      this.aggregationCardinalityLimit = viewOptions.aggregationCardinalityLimit;
    }
  };

  // node_modules/@opentelemetry/sdk-metrics/build/esm/MeterProvider.js
  var MeterProvider = class {
    _sharedState;
    _shutdown = false;
    constructor(options) {
      this._sharedState = new MeterProviderSharedState(options?.resource ?? defaultResource());
      if (options?.views != null && options.views.length > 0) {
        for (const viewOption of options.views) {
          this._sharedState.viewRegistry.addView(new View(viewOption));
        }
      }
      if (options?.readers != null && options.readers.length > 0) {
        for (const metricReader of options.readers) {
          const collector = new MetricCollector(this._sharedState, metricReader);
          metricReader.setMetricProducer(collector);
          this._sharedState.metricCollectors.push(collector);
        }
      }
    }
    /**
     * Get a meter with the configuration of the MeterProvider.
     */
    getMeter(name, version = "", options = {}) {
      if (this._shutdown) {
        diag2.warn("A shutdown MeterProvider cannot provide a Meter");
        return createNoopMeter();
      }
      return this._sharedState.getMeterSharedState({
        name,
        version,
        schemaUrl: options.schemaUrl
      }).meter;
    }
    /**
     * Shut down the MeterProvider and all registered
     * MetricReaders.
     *
     * Returns a promise which is resolved when all flushes are complete.
     */
    async shutdown(options) {
      if (this._shutdown) {
        diag2.warn("shutdown may only be called once per MeterProvider");
        return;
      }
      this._shutdown = true;
      await Promise.all(this._sharedState.metricCollectors.map((collector) => {
        return collector.shutdown(options);
      }));
    }
    /**
     * Notifies all registered MetricReaders to flush any buffered data.
     *
     * Returns a promise which is resolved when all flushes are complete.
     */
    async forceFlush(options) {
      if (this._shutdown) {
        diag2.warn("invalid attempt to force flush after MeterProvider shutdown");
        return;
      }
      await Promise.all(this._sharedState.metricCollectors.map((collector) => {
        return collector.forceFlush(options);
      }));
    }
  };

  // node_modules/@opentelemetry/otlp-transformer/build/esm/metrics/internal-types.js
  var EAggregationTemporality;
  (function(EAggregationTemporality2) {
    EAggregationTemporality2[EAggregationTemporality2["AGGREGATION_TEMPORALITY_UNSPECIFIED"] = 0] = "AGGREGATION_TEMPORALITY_UNSPECIFIED";
    EAggregationTemporality2[EAggregationTemporality2["AGGREGATION_TEMPORALITY_DELTA"] = 1] = "AGGREGATION_TEMPORALITY_DELTA";
    EAggregationTemporality2[EAggregationTemporality2["AGGREGATION_TEMPORALITY_CUMULATIVE"] = 2] = "AGGREGATION_TEMPORALITY_CUMULATIVE";
  })(EAggregationTemporality || (EAggregationTemporality = {}));

  // node_modules/@opentelemetry/otlp-transformer/build/esm/metrics/internal.js
  function toResourceMetrics(resourceMetrics, options) {
    const encoder = getOtlpEncoder(options);
    const processedResource = createResource(resourceMetrics.resource);
    return {
      resource: processedResource,
      schemaUrl: processedResource.schemaUrl,
      scopeMetrics: toScopeMetrics(resourceMetrics.scopeMetrics, encoder)
    };
  }
  function toScopeMetrics(scopeMetrics, encoder) {
    return Array.from(scopeMetrics.map((metrics2) => ({
      scope: createInstrumentationScope(metrics2.scope),
      metrics: metrics2.metrics.map((metricData) => toMetric(metricData, encoder)),
      schemaUrl: metrics2.scope.schemaUrl
    })));
  }
  function toMetric(metricData, encoder) {
    const out = {
      name: metricData.descriptor.name,
      description: metricData.descriptor.description,
      unit: metricData.descriptor.unit
    };
    const aggregationTemporality = toAggregationTemporality(metricData.aggregationTemporality);
    switch (metricData.dataPointType) {
      case DataPointType.SUM:
        out.sum = {
          aggregationTemporality,
          isMonotonic: metricData.isMonotonic,
          dataPoints: toSingularDataPoints(metricData, encoder)
        };
        break;
      case DataPointType.GAUGE:
        out.gauge = {
          dataPoints: toSingularDataPoints(metricData, encoder)
        };
        break;
      case DataPointType.HISTOGRAM:
        out.histogram = {
          aggregationTemporality,
          dataPoints: toHistogramDataPoints(metricData, encoder)
        };
        break;
      case DataPointType.EXPONENTIAL_HISTOGRAM:
        out.exponentialHistogram = {
          aggregationTemporality,
          dataPoints: toExponentialHistogramDataPoints(metricData, encoder)
        };
        break;
    }
    return out;
  }
  function toSingularDataPoint(dataPoint, valueType, encoder) {
    const out = {
      attributes: toAttributes(dataPoint.attributes),
      startTimeUnixNano: encoder.encodeHrTime(dataPoint.startTime),
      timeUnixNano: encoder.encodeHrTime(dataPoint.endTime)
    };
    switch (valueType) {
      case ValueType.INT:
        out.asInt = dataPoint.value;
        break;
      case ValueType.DOUBLE:
        out.asDouble = dataPoint.value;
        break;
    }
    return out;
  }
  function toSingularDataPoints(metricData, encoder) {
    return metricData.dataPoints.map((dataPoint) => {
      return toSingularDataPoint(dataPoint, metricData.descriptor.valueType, encoder);
    });
  }
  function toHistogramDataPoints(metricData, encoder) {
    return metricData.dataPoints.map((dataPoint) => {
      const histogram = dataPoint.value;
      return {
        attributes: toAttributes(dataPoint.attributes),
        bucketCounts: histogram.buckets.counts,
        explicitBounds: histogram.buckets.boundaries,
        count: histogram.count,
        sum: histogram.sum,
        min: histogram.min,
        max: histogram.max,
        startTimeUnixNano: encoder.encodeHrTime(dataPoint.startTime),
        timeUnixNano: encoder.encodeHrTime(dataPoint.endTime)
      };
    });
  }
  function toExponentialHistogramDataPoints(metricData, encoder) {
    return metricData.dataPoints.map((dataPoint) => {
      const histogram = dataPoint.value;
      return {
        attributes: toAttributes(dataPoint.attributes),
        count: histogram.count,
        min: histogram.min,
        max: histogram.max,
        sum: histogram.sum,
        positive: {
          offset: histogram.positive.offset,
          bucketCounts: histogram.positive.bucketCounts
        },
        negative: {
          offset: histogram.negative.offset,
          bucketCounts: histogram.negative.bucketCounts
        },
        scale: histogram.scale,
        zeroCount: histogram.zeroCount,
        startTimeUnixNano: encoder.encodeHrTime(dataPoint.startTime),
        timeUnixNano: encoder.encodeHrTime(dataPoint.endTime)
      };
    });
  }
  function toAggregationTemporality(temporality) {
    switch (temporality) {
      case AggregationTemporality.DELTA:
        return EAggregationTemporality.AGGREGATION_TEMPORALITY_DELTA;
      case AggregationTemporality.CUMULATIVE:
        return EAggregationTemporality.AGGREGATION_TEMPORALITY_CUMULATIVE;
    }
  }
  function createExportMetricsServiceRequest(resourceMetrics, options) {
    return {
      resourceMetrics: resourceMetrics.map((metrics2) => toResourceMetrics(metrics2, options))
    };
  }

  // node_modules/@opentelemetry/otlp-transformer/build/esm/trace/internal.js
  var SPAN_FLAGS_CONTEXT_HAS_IS_REMOTE_MASK = 256;
  var SPAN_FLAGS_CONTEXT_IS_REMOTE_MASK = 512;
  function buildSpanFlagsFrom(traceFlags, isRemote) {
    let flags = traceFlags & 255 | SPAN_FLAGS_CONTEXT_HAS_IS_REMOTE_MASK;
    if (isRemote) {
      flags |= SPAN_FLAGS_CONTEXT_IS_REMOTE_MASK;
    }
    return flags;
  }
  function sdkSpanToOtlpSpan(span, encoder) {
    const ctx = span.spanContext();
    const status = span.status;
    const parentSpanId = span.parentSpanContext?.spanId ? encoder.encodeSpanContext(span.parentSpanContext?.spanId) : void 0;
    return {
      traceId: encoder.encodeSpanContext(ctx.traceId),
      spanId: encoder.encodeSpanContext(ctx.spanId),
      parentSpanId,
      traceState: ctx.traceState?.serialize(),
      name: span.name,
      // Span kind is offset by 1 because the API does not define a value for unset
      kind: span.kind == null ? 0 : span.kind + 1,
      startTimeUnixNano: encoder.encodeHrTime(span.startTime),
      endTimeUnixNano: encoder.encodeHrTime(span.endTime),
      attributes: toAttributes(span.attributes),
      droppedAttributesCount: span.droppedAttributesCount,
      events: span.events.map((event) => toOtlpSpanEvent(event, encoder)),
      droppedEventsCount: span.droppedEventsCount,
      status: {
        // API and proto enums share the same values
        code: status.code,
        message: status.message
      },
      links: span.links.map((link) => toOtlpLink(link, encoder)),
      droppedLinksCount: span.droppedLinksCount,
      flags: buildSpanFlagsFrom(ctx.traceFlags, span.parentSpanContext?.isRemote)
    };
  }
  function toOtlpLink(link, encoder) {
    return {
      attributes: link.attributes ? toAttributes(link.attributes) : [],
      spanId: encoder.encodeSpanContext(link.context.spanId),
      traceId: encoder.encodeSpanContext(link.context.traceId),
      traceState: link.context.traceState?.serialize(),
      droppedAttributesCount: link.droppedAttributesCount || 0,
      flags: buildSpanFlagsFrom(link.context.traceFlags, link.context.isRemote)
    };
  }
  function toOtlpSpanEvent(timedEvent, encoder) {
    return {
      attributes: timedEvent.attributes ? toAttributes(timedEvent.attributes) : [],
      name: timedEvent.name,
      timeUnixNano: encoder.encodeHrTime(timedEvent.time),
      droppedAttributesCount: timedEvent.droppedAttributesCount || 0
    };
  }
  function createExportTraceServiceRequest(spans, options) {
    const encoder = getOtlpEncoder(options);
    return {
      resourceSpans: spanRecordsToResourceSpans(spans, encoder)
    };
  }
  function createResourceMap2(readableSpans) {
    const resourceMap = /* @__PURE__ */ new Map();
    for (const record of readableSpans) {
      let ilsMap = resourceMap.get(record.resource);
      if (!ilsMap) {
        ilsMap = /* @__PURE__ */ new Map();
        resourceMap.set(record.resource, ilsMap);
      }
      const instrumentationScopeKey = `${record.instrumentationScope.name}@${record.instrumentationScope.version || ""}:${record.instrumentationScope.schemaUrl || ""}`;
      let records = ilsMap.get(instrumentationScopeKey);
      if (!records) {
        records = [];
        ilsMap.set(instrumentationScopeKey, records);
      }
      records.push(record);
    }
    return resourceMap;
  }
  function spanRecordsToResourceSpans(readableSpans, encoder) {
    const resourceMap = createResourceMap2(readableSpans);
    const out = [];
    const entryIterator = resourceMap.entries();
    let entry = entryIterator.next();
    while (!entry.done) {
      const [resource, ilmMap] = entry.value;
      const scopeResourceSpans = [];
      const ilmIterator = ilmMap.values();
      let ilmEntry = ilmIterator.next();
      while (!ilmEntry.done) {
        const scopeSpans = ilmEntry.value;
        if (scopeSpans.length > 0) {
          const spans = scopeSpans.map((readableSpan) => sdkSpanToOtlpSpan(readableSpan, encoder));
          scopeResourceSpans.push({
            scope: createInstrumentationScope(scopeSpans[0].instrumentationScope),
            spans,
            schemaUrl: scopeSpans[0].instrumentationScope.schemaUrl
          });
        }
        ilmEntry = ilmIterator.next();
      }
      const processedResource = createResource(resource);
      const transformedSpans = {
        resource: processedResource,
        scopeSpans: scopeResourceSpans,
        schemaUrl: processedResource.schemaUrl
      };
      out.push(transformedSpans);
      entry = entryIterator.next();
    }
    return out;
  }

  // node_modules/@opentelemetry/otlp-transformer/build/esm/logs/json/logs.js
  var JsonLogsSerializer = {
    serializeRequest: (arg) => {
      const request = createExportLogsServiceRequest(arg, {
        useHex: true,
        useLongBits: false
      });
      const encoder = new TextEncoder();
      return encoder.encode(JSON.stringify(request));
    },
    deserializeResponse: (arg) => {
      if (arg.length === 0) {
        return {};
      }
      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(arg));
    }
  };

  // node_modules/@opentelemetry/otlp-transformer/build/esm/metrics/json/metrics.js
  var JsonMetricsSerializer = {
    serializeRequest: (arg) => {
      const request = createExportMetricsServiceRequest([arg], {
        useLongBits: false
      });
      const encoder = new TextEncoder();
      return encoder.encode(JSON.stringify(request));
    },
    deserializeResponse: (arg) => {
      if (arg.length === 0) {
        return {};
      }
      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(arg));
    }
  };

  // node_modules/@opentelemetry/otlp-transformer/build/esm/trace/json/trace.js
  var JsonTraceSerializer = {
    serializeRequest: (arg) => {
      const request = createExportTraceServiceRequest(arg, {
        useHex: true,
        useLongBits: false
      });
      const encoder = new TextEncoder();
      return encoder.encode(JSON.stringify(request));
    },
    deserializeResponse: (arg) => {
      if (arg.length === 0) {
        return {};
      }
      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(arg));
    }
  };

  // node_modules/@opentelemetry/otlp-exporter-base/build/esm/retrying-transport.js
  var MAX_ATTEMPTS = 5;
  var INITIAL_BACKOFF = 1e3;
  var MAX_BACKOFF = 5e3;
  var BACKOFF_MULTIPLIER = 1.5;
  var JITTER = 0.2;
  function getJitter() {
    return Math.random() * (2 * JITTER) - JITTER;
  }
  var RetryingTransport = class {
    _transport;
    constructor(_transport) {
      this._transport = _transport;
    }
    retry(data, timeoutMillis, inMillis) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          this._transport.send(data, timeoutMillis).then(resolve, reject);
        }, inMillis);
      });
    }
    async send(data, timeoutMillis) {
      const deadline = Date.now() + timeoutMillis;
      let result = await this._transport.send(data, timeoutMillis);
      let attempts = MAX_ATTEMPTS;
      let nextBackoff = INITIAL_BACKOFF;
      while (result.status === "retryable" && attempts > 0) {
        attempts--;
        const backoff = Math.max(Math.min(nextBackoff, MAX_BACKOFF) + getJitter(), 0);
        nextBackoff = nextBackoff * BACKOFF_MULTIPLIER;
        const retryInMillis = result.retryInMillis ?? backoff;
        const remainingTimeoutMillis = deadline - Date.now();
        if (retryInMillis > remainingTimeoutMillis) {
          return result;
        }
        result = await this.retry(data, remainingTimeoutMillis, retryInMillis);
      }
      return result;
    }
    shutdown() {
      return this._transport.shutdown();
    }
  };
  function createRetryingTransport(options) {
    return new RetryingTransport(options.transport);
  }

  // node_modules/@opentelemetry/otlp-exporter-base/build/esm/is-export-retryable.js
  function isExportRetryable(statusCode) {
    const retryCodes = [429, 502, 503, 504];
    return retryCodes.includes(statusCode);
  }
  function parseRetryAfterToMills(retryAfter) {
    if (retryAfter == null) {
      return void 0;
    }
    const seconds = Number.parseInt(retryAfter, 10);
    if (Number.isInteger(seconds)) {
      return seconds > 0 ? seconds * 1e3 : -1;
    }
    const delay = new Date(retryAfter).getTime() - Date.now();
    if (delay >= 0) {
      return delay;
    }
    return 0;
  }

  // node_modules/@opentelemetry/otlp-exporter-base/build/esm/transport/xhr-transport.js
  var XhrTransport = class {
    _parameters;
    constructor(_parameters) {
      this._parameters = _parameters;
    }
    async send(data, timeoutMillis) {
      const headers = await this._parameters.headers();
      const response = await new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.timeout = timeoutMillis;
        xhr.open("POST", this._parameters.url);
        Object.entries(headers).forEach(([k, v]) => {
          xhr.setRequestHeader(k, v);
        });
        xhr.ontimeout = (_) => {
          resolve({
            status: "failure",
            error: new Error("XHR request timed out")
          });
        };
        xhr.onreadystatechange = () => {
          if (xhr.status >= 200 && xhr.status <= 299) {
            diag2.debug("XHR success");
            resolve({
              status: "success"
            });
          } else if (xhr.status && isExportRetryable(xhr.status)) {
            resolve({
              status: "retryable",
              retryInMillis: parseRetryAfterToMills(xhr.getResponseHeader("Retry-After"))
            });
          } else if (xhr.status !== 0) {
            resolve({
              status: "failure",
              error: new Error("XHR request failed with non-retryable status")
            });
          }
        };
        xhr.onabort = () => {
          resolve({
            status: "failure",
            error: new Error("XHR request aborted")
          });
        };
        xhr.onerror = () => {
          resolve({
            status: "failure",
            error: new Error("XHR request errored")
          });
        };
        xhr.send(data);
      });
      return response;
    }
    shutdown() {
    }
  };
  function createXhrTransport(parameters) {
    return new XhrTransport(parameters);
  }

  // node_modules/@opentelemetry/otlp-exporter-base/build/esm/transport/send-beacon-transport.js
  var SendBeaconTransport = class {
    _params;
    constructor(_params) {
      this._params = _params;
    }
    async send(data) {
      const blobType = (await this._params.headers())["Content-Type"];
      return new Promise((resolve) => {
        if (navigator.sendBeacon(this._params.url, new Blob([data], { type: blobType }))) {
          diag2.debug("SendBeacon success");
          resolve({
            status: "success"
          });
        } else {
          resolve({
            status: "failure",
            error: new Error("SendBeacon failed")
          });
        }
      });
    }
    shutdown() {
    }
  };
  function createSendBeaconTransport(parameters) {
    return new SendBeaconTransport(parameters);
  }

  // node_modules/@opentelemetry/otlp-exporter-base/build/esm/transport/fetch-transport.js
  var FetchTransport = class {
    _parameters;
    constructor(_parameters) {
      this._parameters = _parameters;
    }
    async send(data, timeoutMillis) {
      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), timeoutMillis);
      try {
        const isBrowserEnvironment = !!globalThis.location;
        const url = new URL(this._parameters.url);
        const response = await fetch(url.href, {
          method: "POST",
          headers: await this._parameters.headers(),
          body: data,
          signal: abortController.signal,
          keepalive: isBrowserEnvironment,
          mode: isBrowserEnvironment ? globalThis.location?.origin === url.origin ? "same-origin" : "cors" : "no-cors"
        });
        if (response.status >= 200 && response.status <= 299) {
          diag2.debug("response success");
          return { status: "success" };
        } else if (isExportRetryable(response.status)) {
          const retryAfter = response.headers.get("Retry-After");
          const retryInMillis = parseRetryAfterToMills(retryAfter);
          return { status: "retryable", retryInMillis };
        }
        return {
          status: "failure",
          error: new Error("Fetch request failed with non-retryable status")
        };
      } catch (error) {
        if (error?.name === "AbortError") {
          return {
            status: "failure",
            error: new Error("Fetch request timed out", { cause: error })
          };
        }
        return {
          status: "failure",
          error: new Error("Fetch request errored", { cause: error })
        };
      } finally {
        clearTimeout(timeout);
      }
    }
    shutdown() {
    }
  };
  function createFetchTransport(parameters) {
    return new FetchTransport(parameters);
  }

  // node_modules/@opentelemetry/otlp-exporter-base/build/esm/otlp-browser-http-export-delegate.js
  function createOtlpXhrExportDelegate(options, serializer) {
    return createOtlpNetworkExportDelegate(options, serializer, createRetryingTransport({
      transport: createXhrTransport(options)
    }));
  }
  function createOtlpFetchExportDelegate(options, serializer) {
    return createOtlpNetworkExportDelegate(options, serializer, createRetryingTransport({
      transport: createFetchTransport(options)
    }));
  }
  function createOtlpSendBeaconExportDelegate(options, serializer) {
    return createOtlpNetworkExportDelegate(options, serializer, createRetryingTransport({
      transport: createSendBeaconTransport({
        url: options.url,
        headers: options.headers
      })
    }));
  }

  // node_modules/@opentelemetry/otlp-exporter-base/build/esm/util.js
  function validateAndNormalizeHeaders(partialHeaders) {
    const headers = {};
    Object.entries(partialHeaders ?? {}).forEach(([key, value]) => {
      if (typeof value !== "undefined") {
        headers[key] = String(value);
      } else {
        diag2.warn(`Header "${key}" has invalid value (${value}) and will be ignored`);
      }
    });
    return headers;
  }

  // node_modules/@opentelemetry/otlp-exporter-base/build/esm/configuration/otlp-http-configuration.js
  function mergeHeaders(userProvidedHeaders, fallbackHeaders, defaultHeaders) {
    return async () => {
      const requiredHeaders = {
        ...await defaultHeaders()
      };
      const headers = {};
      if (fallbackHeaders != null) {
        Object.assign(headers, await fallbackHeaders());
      }
      if (userProvidedHeaders != null) {
        Object.assign(headers, validateAndNormalizeHeaders(await userProvidedHeaders()));
      }
      return Object.assign(headers, requiredHeaders);
    };
  }
  function validateUserProvidedUrl(url) {
    if (url == null) {
      return void 0;
    }
    try {
      const base = globalThis.location?.href;
      return new URL(url, base).href;
    } catch {
      throw new Error(`Configuration: Could not parse user-provided export URL: '${url}'`);
    }
  }
  function mergeOtlpHttpConfigurationWithDefaults(userProvidedConfiguration, fallbackConfiguration, defaultConfiguration) {
    return {
      ...mergeOtlpSharedConfigurationWithDefaults(userProvidedConfiguration, fallbackConfiguration, defaultConfiguration),
      headers: mergeHeaders(userProvidedConfiguration.headers, fallbackConfiguration.headers, defaultConfiguration.headers),
      url: validateUserProvidedUrl(userProvidedConfiguration.url) ?? fallbackConfiguration.url ?? defaultConfiguration.url
    };
  }
  function getHttpConfigurationDefaults(requiredHeaders, signalResourcePath) {
    return {
      ...getSharedConfigurationDefaults(),
      headers: async () => requiredHeaders,
      url: "http://localhost:4318/" + signalResourcePath
    };
  }

  // node_modules/@opentelemetry/otlp-exporter-base/build/esm/configuration/convert-legacy-http-options.js
  function convertLegacyHeaders(config) {
    if (typeof config.headers === "function") {
      return config.headers;
    }
    return wrapStaticHeadersInFunction(config.headers);
  }

  // node_modules/@opentelemetry/otlp-exporter-base/build/esm/configuration/convert-legacy-browser-http-options.js
  function convertLegacyBrowserHttpOptions(config, signalResourcePath, requiredHeaders) {
    return mergeOtlpHttpConfigurationWithDefaults(
      {
        url: config.url,
        timeoutMillis: config.timeoutMillis,
        headers: convertLegacyHeaders(config),
        concurrencyLimit: config.concurrencyLimit
      },
      {},
      // no fallback for browser case
      getHttpConfigurationDefaults(requiredHeaders, signalResourcePath)
    );
  }

  // node_modules/@opentelemetry/otlp-exporter-base/build/esm/configuration/create-legacy-browser-delegate.js
  function createLegacyOtlpBrowserExportDelegate(config, serializer, signalResourcePath, requiredHeaders) {
    const createOtlpExportDelegate2 = inferExportDelegateToUse(config.headers);
    const options = convertLegacyBrowserHttpOptions(config, signalResourcePath, requiredHeaders);
    return createOtlpExportDelegate2(options, serializer);
  }
  function inferExportDelegateToUse(configHeaders) {
    if (!configHeaders && typeof navigator.sendBeacon === "function") {
      return createOtlpSendBeaconExportDelegate;
    } else if (typeof globalThis.fetch !== "undefined") {
      return createOtlpFetchExportDelegate;
    } else {
      return createOtlpXhrExportDelegate;
    }
  }

  // node_modules/@opentelemetry/exporter-logs-otlp-http/build/esm/platform/browser/OTLPLogExporter.js
  var OTLPLogExporter = class extends OTLPExporterBase {
    constructor(config = {}) {
      super(createLegacyOtlpBrowserExportDelegate(config, JsonLogsSerializer, "v1/logs", { "Content-Type": "application/json" }));
    }
  };

  // node_modules/@opentelemetry/exporter-metrics-otlp-http/build/esm/OTLPMetricExporterOptions.js
  var AggregationTemporalityPreference;
  (function(AggregationTemporalityPreference2) {
    AggregationTemporalityPreference2[AggregationTemporalityPreference2["DELTA"] = 0] = "DELTA";
    AggregationTemporalityPreference2[AggregationTemporalityPreference2["CUMULATIVE"] = 1] = "CUMULATIVE";
    AggregationTemporalityPreference2[AggregationTemporalityPreference2["LOWMEMORY"] = 2] = "LOWMEMORY";
  })(AggregationTemporalityPreference || (AggregationTemporalityPreference = {}));

  // node_modules/@opentelemetry/exporter-metrics-otlp-http/build/esm/OTLPMetricExporterBase.js
  var CumulativeTemporalitySelector = () => AggregationTemporality.CUMULATIVE;
  var DeltaTemporalitySelector = (instrumentType) => {
    switch (instrumentType) {
      case InstrumentType.COUNTER:
      case InstrumentType.OBSERVABLE_COUNTER:
      case InstrumentType.GAUGE:
      case InstrumentType.HISTOGRAM:
      case InstrumentType.OBSERVABLE_GAUGE:
        return AggregationTemporality.DELTA;
      case InstrumentType.UP_DOWN_COUNTER:
      case InstrumentType.OBSERVABLE_UP_DOWN_COUNTER:
        return AggregationTemporality.CUMULATIVE;
    }
  };
  var LowMemoryTemporalitySelector = (instrumentType) => {
    switch (instrumentType) {
      case InstrumentType.COUNTER:
      case InstrumentType.HISTOGRAM:
        return AggregationTemporality.DELTA;
      case InstrumentType.GAUGE:
      case InstrumentType.UP_DOWN_COUNTER:
      case InstrumentType.OBSERVABLE_UP_DOWN_COUNTER:
      case InstrumentType.OBSERVABLE_COUNTER:
      case InstrumentType.OBSERVABLE_GAUGE:
        return AggregationTemporality.CUMULATIVE;
    }
  };
  function chooseTemporalitySelectorFromEnvironment() {
    const configuredTemporality = (getStringFromEnv("OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE") ?? "cumulative").toLowerCase();
    if (configuredTemporality === "cumulative") {
      return CumulativeTemporalitySelector;
    }
    if (configuredTemporality === "delta") {
      return DeltaTemporalitySelector;
    }
    if (configuredTemporality === "lowmemory") {
      return LowMemoryTemporalitySelector;
    }
    diag2.warn(`OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE is set to '${configuredTemporality}', but only 'cumulative' and 'delta' are allowed. Using default ('cumulative') instead.`);
    return CumulativeTemporalitySelector;
  }
  function chooseTemporalitySelector(temporalityPreference) {
    if (temporalityPreference != null) {
      if (temporalityPreference === AggregationTemporalityPreference.DELTA) {
        return DeltaTemporalitySelector;
      } else if (temporalityPreference === AggregationTemporalityPreference.LOWMEMORY) {
        return LowMemoryTemporalitySelector;
      }
      return CumulativeTemporalitySelector;
    }
    return chooseTemporalitySelectorFromEnvironment();
  }
  var DEFAULT_AGGREGATION2 = Object.freeze({
    type: AggregationType.DEFAULT
  });
  function chooseAggregationSelector(config) {
    return config?.aggregationPreference ?? (() => DEFAULT_AGGREGATION2);
  }
  var OTLPMetricExporterBase = class extends OTLPExporterBase {
    _aggregationTemporalitySelector;
    _aggregationSelector;
    constructor(delegate, config) {
      super(delegate);
      this._aggregationSelector = chooseAggregationSelector(config);
      this._aggregationTemporalitySelector = chooseTemporalitySelector(config?.temporalityPreference);
    }
    selectAggregation(instrumentType) {
      return this._aggregationSelector(instrumentType);
    }
    selectAggregationTemporality(instrumentType) {
      return this._aggregationTemporalitySelector(instrumentType);
    }
  };

  // node_modules/@opentelemetry/exporter-metrics-otlp-http/build/esm/platform/browser/OTLPMetricExporter.js
  var OTLPMetricExporter = class extends OTLPMetricExporterBase {
    constructor(config) {
      super(createLegacyOtlpBrowserExportDelegate(config ?? {}, JsonMetricsSerializer, "v1/metrics", { "Content-Type": "application/json" }), config);
    }
  };

  // node_modules/@opentelemetry/exporter-trace-otlp-http/build/esm/platform/browser/OTLPTraceExporter.js
  var OTLPTraceExporter = class extends OTLPExporterBase {
    constructor(config = {}) {
      super(createLegacyOtlpBrowserExportDelegate(config, JsonTraceSerializer, "v1/traces", { "Content-Type": "application/json" }));
    }
  };

  // node_modules/@opentelemetry/sdk-logs/build/esm/LogRecordImpl.js
  var LogRecordImpl = class {
    hrTime;
    hrTimeObserved;
    spanContext;
    resource;
    instrumentationScope;
    attributes = {};
    _severityText;
    _severityNumber;
    _body;
    _eventName;
    totalAttributesCount = 0;
    _isReadonly = false;
    _logRecordLimits;
    set severityText(severityText) {
      if (this._isLogRecordReadonly()) {
        return;
      }
      this._severityText = severityText;
    }
    get severityText() {
      return this._severityText;
    }
    set severityNumber(severityNumber) {
      if (this._isLogRecordReadonly()) {
        return;
      }
      this._severityNumber = severityNumber;
    }
    get severityNumber() {
      return this._severityNumber;
    }
    set body(body) {
      if (this._isLogRecordReadonly()) {
        return;
      }
      this._body = body;
    }
    get body() {
      return this._body;
    }
    get eventName() {
      return this._eventName;
    }
    set eventName(eventName) {
      if (this._isLogRecordReadonly()) {
        return;
      }
      this._eventName = eventName;
    }
    get droppedAttributesCount() {
      return this.totalAttributesCount - Object.keys(this.attributes).length;
    }
    constructor(_sharedState, instrumentationScope, logRecord) {
      const { timestamp, observedTimestamp, eventName, severityNumber, severityText, body, attributes = {}, context: context2 } = logRecord;
      const now = Date.now();
      this.hrTime = timeInputToHrTime(timestamp ?? now);
      this.hrTimeObserved = timeInputToHrTime(observedTimestamp ?? now);
      if (context2) {
        const spanContext = trace.getSpanContext(context2);
        if (spanContext && isSpanContextValid(spanContext)) {
          this.spanContext = spanContext;
        }
      }
      this.severityNumber = severityNumber;
      this.severityText = severityText;
      this.body = body;
      this.resource = _sharedState.resource;
      this.instrumentationScope = instrumentationScope;
      this._logRecordLimits = _sharedState.logRecordLimits;
      this._eventName = eventName;
      this.setAttributes(attributes);
    }
    setAttribute(key, value) {
      if (this._isLogRecordReadonly()) {
        return this;
      }
      if (value === null) {
        return this;
      }
      if (key.length === 0) {
        diag2.warn(`Invalid attribute key: ${key}`);
        return this;
      }
      if (!isAttributeValue(value) && !(typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0)) {
        diag2.warn(`Invalid attribute value set for key: ${key}`);
        return this;
      }
      this.totalAttributesCount += 1;
      if (Object.keys(this.attributes).length >= this._logRecordLimits.attributeCountLimit && !Object.prototype.hasOwnProperty.call(this.attributes, key)) {
        if (this.droppedAttributesCount === 1) {
          diag2.warn("Dropping extra attributes.");
        }
        return this;
      }
      if (isAttributeValue(value)) {
        this.attributes[key] = this._truncateToSize(value);
      } else {
        this.attributes[key] = value;
      }
      return this;
    }
    setAttributes(attributes) {
      for (const [k, v] of Object.entries(attributes)) {
        this.setAttribute(k, v);
      }
      return this;
    }
    setBody(body) {
      this.body = body;
      return this;
    }
    setEventName(eventName) {
      this.eventName = eventName;
      return this;
    }
    setSeverityNumber(severityNumber) {
      this.severityNumber = severityNumber;
      return this;
    }
    setSeverityText(severityText) {
      this.severityText = severityText;
      return this;
    }
    /**
     * @internal
     * A LogRecordProcessor may freely modify logRecord for the duration of the OnEmit call.
     * If logRecord is needed after OnEmit returns (i.e. for asynchronous processing) only reads are permitted.
     */
    _makeReadonly() {
      this._isReadonly = true;
    }
    _truncateToSize(value) {
      const limit = this._logRecordLimits.attributeValueLengthLimit;
      if (limit <= 0) {
        diag2.warn(`Attribute value limit must be positive, got ${limit}`);
        return value;
      }
      if (typeof value === "string") {
        return this._truncateToLimitUtil(value, limit);
      }
      if (Array.isArray(value)) {
        return value.map((val) => typeof val === "string" ? this._truncateToLimitUtil(val, limit) : val);
      }
      return value;
    }
    _truncateToLimitUtil(value, limit) {
      if (value.length <= limit) {
        return value;
      }
      return value.substring(0, limit);
    }
    _isLogRecordReadonly() {
      if (this._isReadonly) {
        diag2.warn("Can not execute the operation on emitted log record");
      }
      return this._isReadonly;
    }
  };

  // node_modules/@opentelemetry/sdk-logs/build/esm/Logger.js
  var Logger = class {
    instrumentationScope;
    _sharedState;
    constructor(instrumentationScope, _sharedState) {
      this.instrumentationScope = instrumentationScope;
      this._sharedState = _sharedState;
    }
    emit(logRecord) {
      const currentContext = logRecord.context || context.active();
      const logRecordInstance = new LogRecordImpl(this._sharedState, this.instrumentationScope, {
        context: currentContext,
        ...logRecord
      });
      this._sharedState.activeProcessor.onEmit(logRecordInstance, currentContext);
      logRecordInstance._makeReadonly();
    }
  };

  // node_modules/@opentelemetry/sdk-logs/build/esm/config.js
  function loadDefaultConfig() {
    return {
      forceFlushTimeoutMillis: 3e4,
      logRecordLimits: {
        attributeValueLengthLimit: getNumberFromEnv("OTEL_LOGRECORD_ATTRIBUTE_VALUE_LENGTH_LIMIT") ?? Infinity,
        attributeCountLimit: getNumberFromEnv("OTEL_LOGRECORD_ATTRIBUTE_COUNT_LIMIT") ?? 128
      },
      includeTraceContext: true
    };
  }
  function reconfigureLimits(logRecordLimits) {
    return {
      /**
       * Reassign log record attribute count limit to use first non null value defined by user or use default value
       */
      attributeCountLimit: logRecordLimits.attributeCountLimit ?? getNumberFromEnv("OTEL_LOGRECORD_ATTRIBUTE_COUNT_LIMIT") ?? getNumberFromEnv("OTEL_ATTRIBUTE_COUNT_LIMIT") ?? 128,
      /**
       * Reassign log record attribute value length limit to use first non null value defined by user or use default value
       */
      attributeValueLengthLimit: logRecordLimits.attributeValueLengthLimit ?? getNumberFromEnv("OTEL_LOGRECORD_ATTRIBUTE_VALUE_LENGTH_LIMIT") ?? getNumberFromEnv("OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT") ?? Infinity
    };
  }

  // node_modules/@opentelemetry/sdk-logs/build/esm/export/NoopLogRecordProcessor.js
  var NoopLogRecordProcessor = class {
    forceFlush() {
      return Promise.resolve();
    }
    onEmit(_logRecord, _context) {
    }
    shutdown() {
      return Promise.resolve();
    }
  };

  // node_modules/@opentelemetry/sdk-logs/build/esm/MultiLogRecordProcessor.js
  var MultiLogRecordProcessor = class {
    processors;
    forceFlushTimeoutMillis;
    constructor(processors, forceFlushTimeoutMillis) {
      this.processors = processors;
      this.forceFlushTimeoutMillis = forceFlushTimeoutMillis;
    }
    async forceFlush() {
      const timeout = this.forceFlushTimeoutMillis;
      await Promise.all(this.processors.map((processor) => callWithTimeout(processor.forceFlush(), timeout)));
    }
    onEmit(logRecord, context2) {
      this.processors.forEach((processors) => processors.onEmit(logRecord, context2));
    }
    async shutdown() {
      await Promise.all(this.processors.map((processor) => processor.shutdown()));
    }
  };

  // node_modules/@opentelemetry/sdk-logs/build/esm/internal/LoggerProviderSharedState.js
  var LoggerProviderSharedState = class {
    resource;
    forceFlushTimeoutMillis;
    logRecordLimits;
    processors;
    loggers = /* @__PURE__ */ new Map();
    activeProcessor;
    registeredLogRecordProcessors = [];
    constructor(resource, forceFlushTimeoutMillis, logRecordLimits, processors) {
      this.resource = resource;
      this.forceFlushTimeoutMillis = forceFlushTimeoutMillis;
      this.logRecordLimits = logRecordLimits;
      this.processors = processors;
      if (processors.length > 0) {
        this.registeredLogRecordProcessors = processors;
        this.activeProcessor = new MultiLogRecordProcessor(this.registeredLogRecordProcessors, this.forceFlushTimeoutMillis);
      } else {
        this.activeProcessor = new NoopLogRecordProcessor();
      }
    }
  };

  // node_modules/@opentelemetry/sdk-logs/build/esm/LoggerProvider.js
  var DEFAULT_LOGGER_NAME = "unknown";
  var LoggerProvider = class {
    _shutdownOnce;
    _sharedState;
    constructor(config = {}) {
      const mergedConfig = merge({}, loadDefaultConfig(), config);
      const resource = config.resource ?? defaultResource();
      this._sharedState = new LoggerProviderSharedState(resource, mergedConfig.forceFlushTimeoutMillis, reconfigureLimits(mergedConfig.logRecordLimits), config?.processors ?? []);
      this._shutdownOnce = new BindOnceFuture(this._shutdown, this);
    }
    /**
     * Get a logger with the configuration of the LoggerProvider.
     */
    getLogger(name, version, options) {
      if (this._shutdownOnce.isCalled) {
        diag2.warn("A shutdown LoggerProvider cannot provide a Logger");
        return NOOP_LOGGER;
      }
      if (!name) {
        diag2.warn("Logger requested without instrumentation scope name.");
      }
      const loggerName = name || DEFAULT_LOGGER_NAME;
      const key = `${loggerName}@${version || ""}:${options?.schemaUrl || ""}`;
      if (!this._sharedState.loggers.has(key)) {
        this._sharedState.loggers.set(key, new Logger({ name: loggerName, version, schemaUrl: options?.schemaUrl }, this._sharedState));
      }
      return this._sharedState.loggers.get(key);
    }
    /**
     * Notifies all registered LogRecordProcessor to flush any buffered data.
     *
     * Returns a promise which is resolved when all flushes are complete.
     */
    forceFlush() {
      if (this._shutdownOnce.isCalled) {
        diag2.warn("invalid attempt to force flush after LoggerProvider shutdown");
        return this._shutdownOnce.promise;
      }
      return this._sharedState.activeProcessor.forceFlush();
    }
    /**
     * Flush all buffered data and shut down the LoggerProvider and all registered
     * LogRecordProcessor.
     *
     * Returns a promise which is resolved when all flushes are complete.
     */
    shutdown() {
      if (this._shutdownOnce.isCalled) {
        diag2.warn("shutdown may only be called once per LoggerProvider");
        return this._shutdownOnce.promise;
      }
      return this._shutdownOnce.call();
    }
    _shutdown() {
      return this._sharedState.activeProcessor.shutdown();
    }
  };

  // node_modules/@opentelemetry/sdk-logs/build/esm/export/BatchLogRecordProcessorBase.js
  var BatchLogRecordProcessorBase = class {
    _exporter;
    _maxExportBatchSize;
    _maxQueueSize;
    _scheduledDelayMillis;
    _exportTimeoutMillis;
    _isExporting = false;
    _finishedLogRecords = [];
    _timer;
    _shutdownOnce;
    constructor(_exporter, config) {
      this._exporter = _exporter;
      this._maxExportBatchSize = config?.maxExportBatchSize ?? getNumberFromEnv("OTEL_BLRP_MAX_EXPORT_BATCH_SIZE") ?? 512;
      this._maxQueueSize = config?.maxQueueSize ?? getNumberFromEnv("OTEL_BLRP_MAX_QUEUE_SIZE") ?? 2048;
      this._scheduledDelayMillis = config?.scheduledDelayMillis ?? getNumberFromEnv("OTEL_BLRP_SCHEDULE_DELAY") ?? 5e3;
      this._exportTimeoutMillis = config?.exportTimeoutMillis ?? getNumberFromEnv("OTEL_BLRP_EXPORT_TIMEOUT") ?? 3e4;
      this._shutdownOnce = new BindOnceFuture(this._shutdown, this);
      if (this._maxExportBatchSize > this._maxQueueSize) {
        diag2.warn("BatchLogRecordProcessor: maxExportBatchSize must be smaller or equal to maxQueueSize, setting maxExportBatchSize to match maxQueueSize");
        this._maxExportBatchSize = this._maxQueueSize;
      }
    }
    onEmit(logRecord) {
      if (this._shutdownOnce.isCalled) {
        return;
      }
      this._addToBuffer(logRecord);
    }
    forceFlush() {
      if (this._shutdownOnce.isCalled) {
        return this._shutdownOnce.promise;
      }
      return this._flushAll();
    }
    shutdown() {
      return this._shutdownOnce.call();
    }
    async _shutdown() {
      this.onShutdown();
      await this._flushAll();
      await this._exporter.shutdown();
    }
    /** Add a LogRecord in the buffer. */
    _addToBuffer(logRecord) {
      if (this._finishedLogRecords.length >= this._maxQueueSize) {
        return;
      }
      this._finishedLogRecords.push(logRecord);
      this._maybeStartTimer();
    }
    /**
     * Send all LogRecords to the exporter respecting the batch size limit
     * This function is used only on forceFlush or shutdown,
     * for all other cases _flush should be used
     * */
    _flushAll() {
      return new Promise((resolve, reject) => {
        const promises = [];
        const batchCount = Math.ceil(this._finishedLogRecords.length / this._maxExportBatchSize);
        for (let i = 0; i < batchCount; i++) {
          promises.push(this._flushOneBatch());
        }
        Promise.all(promises).then(() => {
          resolve();
        }).catch(reject);
      });
    }
    _flushOneBatch() {
      this._clearTimer();
      if (this._finishedLogRecords.length === 0) {
        return Promise.resolve();
      }
      return new Promise((resolve, reject) => {
        callWithTimeout(this._export(this._finishedLogRecords.splice(0, this._maxExportBatchSize)), this._exportTimeoutMillis).then(() => resolve()).catch(reject);
      });
    }
    _maybeStartTimer() {
      if (this._isExporting)
        return;
      const flush = () => {
        this._isExporting = true;
        this._flushOneBatch().then(() => {
          this._isExporting = false;
          if (this._finishedLogRecords.length > 0) {
            this._clearTimer();
            this._maybeStartTimer();
          }
        }).catch((e) => {
          this._isExporting = false;
          globalErrorHandler(e);
        });
      };
      if (this._finishedLogRecords.length >= this._maxExportBatchSize) {
        return flush();
      }
      if (this._timer !== void 0)
        return;
      this._timer = setTimeout(() => flush(), this._scheduledDelayMillis);
      if (typeof this._timer !== "number") {
        this._timer.unref();
      }
    }
    _clearTimer() {
      if (this._timer !== void 0) {
        clearTimeout(this._timer);
        this._timer = void 0;
      }
    }
    _export(logRecords) {
      const doExport = () => internal._export(this._exporter, logRecords).then((result) => {
        if (result.code !== ExportResultCode.SUCCESS) {
          globalErrorHandler(result.error ?? new Error(`BatchLogRecordProcessor: log record export failed (status ${result})`));
        }
      }).catch(globalErrorHandler);
      const pendingResources = logRecords.map((logRecord) => logRecord.resource).filter((resource) => resource.asyncAttributesPending);
      if (pendingResources.length === 0) {
        return doExport();
      } else {
        return Promise.all(pendingResources.map((resource) => resource.waitForAsyncAttributes?.())).then(doExport, globalErrorHandler);
      }
    }
  };

  // node_modules/@opentelemetry/sdk-logs/build/esm/platform/browser/export/BatchLogRecordProcessor.js
  var BatchLogRecordProcessor = class extends BatchLogRecordProcessorBase {
    _visibilityChangeListener;
    _pageHideListener;
    constructor(exporter, config) {
      super(exporter, config);
      this._onInit(config);
    }
    onShutdown() {
      if (typeof document === "undefined") {
        return;
      }
      if (this._visibilityChangeListener) {
        document.removeEventListener("visibilitychange", this._visibilityChangeListener);
      }
      if (this._pageHideListener) {
        document.removeEventListener("pagehide", this._pageHideListener);
      }
    }
    _onInit(config) {
      if (config?.disableAutoFlushOnDocumentHide === true || typeof document === "undefined") {
        return;
      }
      this._visibilityChangeListener = () => {
        if (document.visibilityState === "hidden") {
          void this.forceFlush();
        }
      };
      this._pageHideListener = () => {
        void this.forceFlush();
      };
      document.addEventListener("visibilitychange", this._visibilityChangeListener);
      document.addEventListener("pagehide", this._pageHideListener);
    }
  };

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/enums.js
  var ExceptionEventName = "exception";

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/Span.js
  var SpanImpl = class {
    // Below properties are included to implement ReadableSpan for export
    // purposes but are not intended to be written-to directly.
    _spanContext;
    kind;
    parentSpanContext;
    attributes = {};
    links = [];
    events = [];
    startTime;
    resource;
    instrumentationScope;
    _droppedAttributesCount = 0;
    _droppedEventsCount = 0;
    _droppedLinksCount = 0;
    name;
    status = {
      code: SpanStatusCode.UNSET
    };
    endTime = [0, 0];
    _ended = false;
    _duration = [-1, -1];
    _spanProcessor;
    _spanLimits;
    _attributeValueLengthLimit;
    _performanceStartTime;
    _performanceOffset;
    _startTimeProvided;
    /**
     * Constructs a new SpanImpl instance.
     */
    constructor(opts) {
      const now = Date.now();
      this._spanContext = opts.spanContext;
      this._performanceStartTime = otperformance.now();
      this._performanceOffset = now - (this._performanceStartTime + getTimeOrigin());
      this._startTimeProvided = opts.startTime != null;
      this._spanLimits = opts.spanLimits;
      this._attributeValueLengthLimit = this._spanLimits.attributeValueLengthLimit || 0;
      this._spanProcessor = opts.spanProcessor;
      this.name = opts.name;
      this.parentSpanContext = opts.parentSpanContext;
      this.kind = opts.kind;
      this.links = opts.links || [];
      this.startTime = this._getTime(opts.startTime ?? now);
      this.resource = opts.resource;
      this.instrumentationScope = opts.scope;
      if (opts.attributes != null) {
        this.setAttributes(opts.attributes);
      }
      this._spanProcessor.onStart(this, opts.context);
    }
    spanContext() {
      return this._spanContext;
    }
    setAttribute(key, value) {
      if (value == null || this._isSpanEnded())
        return this;
      if (key.length === 0) {
        diag2.warn(`Invalid attribute key: ${key}`);
        return this;
      }
      if (!isAttributeValue(value)) {
        diag2.warn(`Invalid attribute value set for key: ${key}`);
        return this;
      }
      const { attributeCountLimit } = this._spanLimits;
      if (attributeCountLimit !== void 0 && Object.keys(this.attributes).length >= attributeCountLimit && !Object.prototype.hasOwnProperty.call(this.attributes, key)) {
        this._droppedAttributesCount++;
        return this;
      }
      this.attributes[key] = this._truncateToSize(value);
      return this;
    }
    setAttributes(attributes) {
      for (const [k, v] of Object.entries(attributes)) {
        this.setAttribute(k, v);
      }
      return this;
    }
    /**
     *
     * @param name Span Name
     * @param [attributesOrStartTime] Span attributes or start time
     *     if type is {@type TimeInput} and 3rd param is undefined
     * @param [timeStamp] Specified time stamp for the event
     */
    addEvent(name, attributesOrStartTime, timeStamp) {
      if (this._isSpanEnded())
        return this;
      const { eventCountLimit } = this._spanLimits;
      if (eventCountLimit === 0) {
        diag2.warn("No events allowed.");
        this._droppedEventsCount++;
        return this;
      }
      if (eventCountLimit !== void 0 && this.events.length >= eventCountLimit) {
        if (this._droppedEventsCount === 0) {
          diag2.debug("Dropping extra events.");
        }
        this.events.shift();
        this._droppedEventsCount++;
      }
      if (isTimeInput(attributesOrStartTime)) {
        if (!isTimeInput(timeStamp)) {
          timeStamp = attributesOrStartTime;
        }
        attributesOrStartTime = void 0;
      }
      const attributes = sanitizeAttributes(attributesOrStartTime);
      this.events.push({
        name,
        attributes,
        time: this._getTime(timeStamp),
        droppedAttributesCount: 0
      });
      return this;
    }
    addLink(link) {
      this.links.push(link);
      return this;
    }
    addLinks(links) {
      this.links.push(...links);
      return this;
    }
    setStatus(status) {
      if (this._isSpanEnded())
        return this;
      this.status = { ...status };
      if (this.status.message != null && typeof status.message !== "string") {
        diag2.warn(`Dropping invalid status.message of type '${typeof status.message}', expected 'string'`);
        delete this.status.message;
      }
      return this;
    }
    updateName(name) {
      if (this._isSpanEnded())
        return this;
      this.name = name;
      return this;
    }
    end(endTime) {
      if (this._isSpanEnded()) {
        diag2.error(`${this.name} ${this._spanContext.traceId}-${this._spanContext.spanId} - You can only call end() on a span once.`);
        return;
      }
      this._ended = true;
      this.endTime = this._getTime(endTime);
      this._duration = hrTimeDuration(this.startTime, this.endTime);
      if (this._duration[0] < 0) {
        diag2.warn("Inconsistent start and end time, startTime > endTime. Setting span duration to 0ms.", this.startTime, this.endTime);
        this.endTime = this.startTime.slice();
        this._duration = [0, 0];
      }
      if (this._droppedEventsCount > 0) {
        diag2.warn(`Dropped ${this._droppedEventsCount} events because eventCountLimit reached`);
      }
      this._spanProcessor.onEnd(this);
    }
    _getTime(inp) {
      if (typeof inp === "number" && inp <= otperformance.now()) {
        return hrTime(inp + this._performanceOffset);
      }
      if (typeof inp === "number") {
        return millisToHrTime(inp);
      }
      if (inp instanceof Date) {
        return millisToHrTime(inp.getTime());
      }
      if (isTimeInputHrTime(inp)) {
        return inp;
      }
      if (this._startTimeProvided) {
        return millisToHrTime(Date.now());
      }
      const msDuration = otperformance.now() - this._performanceStartTime;
      return addHrTimes(this.startTime, millisToHrTime(msDuration));
    }
    isRecording() {
      return this._ended === false;
    }
    recordException(exception, time) {
      const attributes = {};
      if (typeof exception === "string") {
        attributes[ATTR_EXCEPTION_MESSAGE] = exception;
      } else if (exception) {
        if (exception.code) {
          attributes[ATTR_EXCEPTION_TYPE] = exception.code.toString();
        } else if (exception.name) {
          attributes[ATTR_EXCEPTION_TYPE] = exception.name;
        }
        if (exception.message) {
          attributes[ATTR_EXCEPTION_MESSAGE] = exception.message;
        }
        if (exception.stack) {
          attributes[ATTR_EXCEPTION_STACKTRACE] = exception.stack;
        }
      }
      if (attributes[ATTR_EXCEPTION_TYPE] || attributes[ATTR_EXCEPTION_MESSAGE]) {
        this.addEvent(ExceptionEventName, attributes, time);
      } else {
        diag2.warn(`Failed to record an exception ${exception}`);
      }
    }
    get duration() {
      return this._duration;
    }
    get ended() {
      return this._ended;
    }
    get droppedAttributesCount() {
      return this._droppedAttributesCount;
    }
    get droppedEventsCount() {
      return this._droppedEventsCount;
    }
    get droppedLinksCount() {
      return this._droppedLinksCount;
    }
    _isSpanEnded() {
      if (this._ended) {
        const error = new Error(`Operation attempted on ended Span {traceId: ${this._spanContext.traceId}, spanId: ${this._spanContext.spanId}}`);
        diag2.warn(`Cannot execute the operation on ended Span {traceId: ${this._spanContext.traceId}, spanId: ${this._spanContext.spanId}}`, error);
      }
      return this._ended;
    }
    // Utility function to truncate given value within size
    // for value type of string, will truncate to given limit
    // for type of non-string, will return same value
    _truncateToLimitUtil(value, limit) {
      if (value.length <= limit) {
        return value;
      }
      return value.substring(0, limit);
    }
    /**
     * If the given attribute value is of type string and has more characters than given {@code attributeValueLengthLimit} then
     * return string with truncated to {@code attributeValueLengthLimit} characters
     *
     * If the given attribute value is array of strings then
     * return new array of strings with each element truncated to {@code attributeValueLengthLimit} characters
     *
     * Otherwise return same Attribute {@code value}
     *
     * @param value Attribute value
     * @returns truncated attribute value if required, otherwise same value
     */
    _truncateToSize(value) {
      const limit = this._attributeValueLengthLimit;
      if (limit <= 0) {
        diag2.warn(`Attribute value limit must be positive, got ${limit}`);
        return value;
      }
      if (typeof value === "string") {
        return this._truncateToLimitUtil(value, limit);
      }
      if (Array.isArray(value)) {
        return value.map((val) => typeof val === "string" ? this._truncateToLimitUtil(val, limit) : val);
      }
      return value;
    }
  };

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/Sampler.js
  var SamplingDecision2;
  (function(SamplingDecision3) {
    SamplingDecision3[SamplingDecision3["NOT_RECORD"] = 0] = "NOT_RECORD";
    SamplingDecision3[SamplingDecision3["RECORD"] = 1] = "RECORD";
    SamplingDecision3[SamplingDecision3["RECORD_AND_SAMPLED"] = 2] = "RECORD_AND_SAMPLED";
  })(SamplingDecision2 || (SamplingDecision2 = {}));

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/sampler/AlwaysOffSampler.js
  var AlwaysOffSampler = class {
    shouldSample() {
      return {
        decision: SamplingDecision2.NOT_RECORD
      };
    }
    toString() {
      return "AlwaysOffSampler";
    }
  };

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/sampler/AlwaysOnSampler.js
  var AlwaysOnSampler = class {
    shouldSample() {
      return {
        decision: SamplingDecision2.RECORD_AND_SAMPLED
      };
    }
    toString() {
      return "AlwaysOnSampler";
    }
  };

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/sampler/ParentBasedSampler.js
  var ParentBasedSampler = class {
    _root;
    _remoteParentSampled;
    _remoteParentNotSampled;
    _localParentSampled;
    _localParentNotSampled;
    constructor(config) {
      this._root = config.root;
      if (!this._root) {
        globalErrorHandler(new Error("ParentBasedSampler must have a root sampler configured"));
        this._root = new AlwaysOnSampler();
      }
      this._remoteParentSampled = config.remoteParentSampled ?? new AlwaysOnSampler();
      this._remoteParentNotSampled = config.remoteParentNotSampled ?? new AlwaysOffSampler();
      this._localParentSampled = config.localParentSampled ?? new AlwaysOnSampler();
      this._localParentNotSampled = config.localParentNotSampled ?? new AlwaysOffSampler();
    }
    shouldSample(context2, traceId, spanName, spanKind, attributes, links) {
      const parentContext = trace.getSpanContext(context2);
      if (!parentContext || !isSpanContextValid(parentContext)) {
        return this._root.shouldSample(context2, traceId, spanName, spanKind, attributes, links);
      }
      if (parentContext.isRemote) {
        if (parentContext.traceFlags & TraceFlags.SAMPLED) {
          return this._remoteParentSampled.shouldSample(context2, traceId, spanName, spanKind, attributes, links);
        }
        return this._remoteParentNotSampled.shouldSample(context2, traceId, spanName, spanKind, attributes, links);
      }
      if (parentContext.traceFlags & TraceFlags.SAMPLED) {
        return this._localParentSampled.shouldSample(context2, traceId, spanName, spanKind, attributes, links);
      }
      return this._localParentNotSampled.shouldSample(context2, traceId, spanName, spanKind, attributes, links);
    }
    toString() {
      return `ParentBased{root=${this._root.toString()}, remoteParentSampled=${this._remoteParentSampled.toString()}, remoteParentNotSampled=${this._remoteParentNotSampled.toString()}, localParentSampled=${this._localParentSampled.toString()}, localParentNotSampled=${this._localParentNotSampled.toString()}}`;
    }
  };

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/sampler/TraceIdRatioBasedSampler.js
  var TraceIdRatioBasedSampler = class {
    _ratio;
    _upperBound;
    constructor(_ratio = 0) {
      this._ratio = _ratio;
      this._ratio = this._normalize(_ratio);
      this._upperBound = Math.floor(this._ratio * 4294967295);
    }
    shouldSample(context2, traceId) {
      return {
        decision: isValidTraceId(traceId) && this._accumulate(traceId) < this._upperBound ? SamplingDecision2.RECORD_AND_SAMPLED : SamplingDecision2.NOT_RECORD
      };
    }
    toString() {
      return `TraceIdRatioBased{${this._ratio}}`;
    }
    _normalize(ratio) {
      if (typeof ratio !== "number" || isNaN(ratio))
        return 0;
      return ratio >= 1 ? 1 : ratio <= 0 ? 0 : ratio;
    }
    _accumulate(traceId) {
      let accumulation = 0;
      for (let i = 0; i < traceId.length / 8; i++) {
        const pos = i * 8;
        const part = parseInt(traceId.slice(pos, pos + 8), 16);
        accumulation = (accumulation ^ part) >>> 0;
      }
      return accumulation;
    }
  };

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/config.js
  var TracesSamplerValues;
  (function(TracesSamplerValues2) {
    TracesSamplerValues2["AlwaysOff"] = "always_off";
    TracesSamplerValues2["AlwaysOn"] = "always_on";
    TracesSamplerValues2["ParentBasedAlwaysOff"] = "parentbased_always_off";
    TracesSamplerValues2["ParentBasedAlwaysOn"] = "parentbased_always_on";
    TracesSamplerValues2["ParentBasedTraceIdRatio"] = "parentbased_traceidratio";
    TracesSamplerValues2["TraceIdRatio"] = "traceidratio";
  })(TracesSamplerValues || (TracesSamplerValues = {}));
  var DEFAULT_RATIO = 1;
  function loadDefaultConfig2() {
    return {
      sampler: buildSamplerFromEnv(),
      forceFlushTimeoutMillis: 3e4,
      generalLimits: {
        attributeValueLengthLimit: getNumberFromEnv("OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT") ?? Infinity,
        attributeCountLimit: getNumberFromEnv("OTEL_ATTRIBUTE_COUNT_LIMIT") ?? 128
      },
      spanLimits: {
        attributeValueLengthLimit: getNumberFromEnv("OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT") ?? Infinity,
        attributeCountLimit: getNumberFromEnv("OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT") ?? 128,
        linkCountLimit: getNumberFromEnv("OTEL_SPAN_LINK_COUNT_LIMIT") ?? 128,
        eventCountLimit: getNumberFromEnv("OTEL_SPAN_EVENT_COUNT_LIMIT") ?? 128,
        attributePerEventCountLimit: getNumberFromEnv("OTEL_SPAN_ATTRIBUTE_PER_EVENT_COUNT_LIMIT") ?? 128,
        attributePerLinkCountLimit: getNumberFromEnv("OTEL_SPAN_ATTRIBUTE_PER_LINK_COUNT_LIMIT") ?? 128
      }
    };
  }
  function buildSamplerFromEnv() {
    const sampler = getStringFromEnv("OTEL_TRACES_SAMPLER") ?? TracesSamplerValues.ParentBasedAlwaysOn;
    switch (sampler) {
      case TracesSamplerValues.AlwaysOn:
        return new AlwaysOnSampler();
      case TracesSamplerValues.AlwaysOff:
        return new AlwaysOffSampler();
      case TracesSamplerValues.ParentBasedAlwaysOn:
        return new ParentBasedSampler({
          root: new AlwaysOnSampler()
        });
      case TracesSamplerValues.ParentBasedAlwaysOff:
        return new ParentBasedSampler({
          root: new AlwaysOffSampler()
        });
      case TracesSamplerValues.TraceIdRatio:
        return new TraceIdRatioBasedSampler(getSamplerProbabilityFromEnv());
      case TracesSamplerValues.ParentBasedTraceIdRatio:
        return new ParentBasedSampler({
          root: new TraceIdRatioBasedSampler(getSamplerProbabilityFromEnv())
        });
      default:
        diag2.error(`OTEL_TRACES_SAMPLER value "${sampler}" invalid, defaulting to "${TracesSamplerValues.ParentBasedAlwaysOn}".`);
        return new ParentBasedSampler({
          root: new AlwaysOnSampler()
        });
    }
  }
  function getSamplerProbabilityFromEnv() {
    const probability = getNumberFromEnv("OTEL_TRACES_SAMPLER_ARG");
    if (probability == null) {
      diag2.error(`OTEL_TRACES_SAMPLER_ARG is blank, defaulting to ${DEFAULT_RATIO}.`);
      return DEFAULT_RATIO;
    }
    if (probability < 0 || probability > 1) {
      diag2.error(`OTEL_TRACES_SAMPLER_ARG=${probability} was given, but it is out of range ([0..1]), defaulting to ${DEFAULT_RATIO}.`);
      return DEFAULT_RATIO;
    }
    return probability;
  }

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/utility.js
  var DEFAULT_ATTRIBUTE_COUNT_LIMIT = 128;
  var DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT = Infinity;
  function mergeConfig(userConfig) {
    const perInstanceDefaults = {
      sampler: buildSamplerFromEnv()
    };
    const DEFAULT_CONFIG = loadDefaultConfig2();
    const target = Object.assign({}, DEFAULT_CONFIG, perInstanceDefaults, userConfig);
    target.generalLimits = Object.assign({}, DEFAULT_CONFIG.generalLimits, userConfig.generalLimits || {});
    target.spanLimits = Object.assign({}, DEFAULT_CONFIG.spanLimits, userConfig.spanLimits || {});
    return target;
  }
  function reconfigureLimits2(userConfig) {
    const spanLimits = Object.assign({}, userConfig.spanLimits);
    spanLimits.attributeCountLimit = userConfig.spanLimits?.attributeCountLimit ?? userConfig.generalLimits?.attributeCountLimit ?? getNumberFromEnv("OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT") ?? getNumberFromEnv("OTEL_ATTRIBUTE_COUNT_LIMIT") ?? DEFAULT_ATTRIBUTE_COUNT_LIMIT;
    spanLimits.attributeValueLengthLimit = userConfig.spanLimits?.attributeValueLengthLimit ?? userConfig.generalLimits?.attributeValueLengthLimit ?? getNumberFromEnv("OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT") ?? getNumberFromEnv("OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT") ?? DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT;
    return Object.assign({}, userConfig, { spanLimits });
  }

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/export/BatchSpanProcessorBase.js
  var BatchSpanProcessorBase = class {
    _exporter;
    _maxExportBatchSize;
    _maxQueueSize;
    _scheduledDelayMillis;
    _exportTimeoutMillis;
    _isExporting = false;
    _finishedSpans = [];
    _timer;
    _shutdownOnce;
    _droppedSpansCount = 0;
    constructor(_exporter, config) {
      this._exporter = _exporter;
      this._maxExportBatchSize = typeof config?.maxExportBatchSize === "number" ? config.maxExportBatchSize : getNumberFromEnv("OTEL_BSP_MAX_EXPORT_BATCH_SIZE") ?? 512;
      this._maxQueueSize = typeof config?.maxQueueSize === "number" ? config.maxQueueSize : getNumberFromEnv("OTEL_BSP_MAX_QUEUE_SIZE") ?? 2048;
      this._scheduledDelayMillis = typeof config?.scheduledDelayMillis === "number" ? config.scheduledDelayMillis : getNumberFromEnv("OTEL_BSP_SCHEDULE_DELAY") ?? 5e3;
      this._exportTimeoutMillis = typeof config?.exportTimeoutMillis === "number" ? config.exportTimeoutMillis : getNumberFromEnv("OTEL_BSP_EXPORT_TIMEOUT") ?? 3e4;
      this._shutdownOnce = new BindOnceFuture(this._shutdown, this);
      if (this._maxExportBatchSize > this._maxQueueSize) {
        diag2.warn("BatchSpanProcessor: maxExportBatchSize must be smaller or equal to maxQueueSize, setting maxExportBatchSize to match maxQueueSize");
        this._maxExportBatchSize = this._maxQueueSize;
      }
    }
    forceFlush() {
      if (this._shutdownOnce.isCalled) {
        return this._shutdownOnce.promise;
      }
      return this._flushAll();
    }
    // does nothing.
    onStart(_span, _parentContext) {
    }
    onEnd(span) {
      if (this._shutdownOnce.isCalled) {
        return;
      }
      if ((span.spanContext().traceFlags & TraceFlags.SAMPLED) === 0) {
        return;
      }
      this._addToBuffer(span);
    }
    shutdown() {
      return this._shutdownOnce.call();
    }
    _shutdown() {
      return Promise.resolve().then(() => {
        return this.onShutdown();
      }).then(() => {
        return this._flushAll();
      }).then(() => {
        return this._exporter.shutdown();
      });
    }
    /** Add a span in the buffer. */
    _addToBuffer(span) {
      if (this._finishedSpans.length >= this._maxQueueSize) {
        if (this._droppedSpansCount === 0) {
          diag2.debug("maxQueueSize reached, dropping spans");
        }
        this._droppedSpansCount++;
        return;
      }
      if (this._droppedSpansCount > 0) {
        diag2.warn(`Dropped ${this._droppedSpansCount} spans because maxQueueSize reached`);
        this._droppedSpansCount = 0;
      }
      this._finishedSpans.push(span);
      this._maybeStartTimer();
    }
    /**
     * Send all spans to the exporter respecting the batch size limit
     * This function is used only on forceFlush or shutdown,
     * for all other cases _flush should be used
     * */
    _flushAll() {
      return new Promise((resolve, reject) => {
        const promises = [];
        const count = Math.ceil(this._finishedSpans.length / this._maxExportBatchSize);
        for (let i = 0, j = count; i < j; i++) {
          promises.push(this._flushOneBatch());
        }
        Promise.all(promises).then(() => {
          resolve();
        }).catch(reject);
      });
    }
    _flushOneBatch() {
      this._clearTimer();
      if (this._finishedSpans.length === 0) {
        return Promise.resolve();
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error("Timeout"));
        }, this._exportTimeoutMillis);
        context.with(suppressTracing(context.active()), () => {
          let spans;
          if (this._finishedSpans.length <= this._maxExportBatchSize) {
            spans = this._finishedSpans;
            this._finishedSpans = [];
          } else {
            spans = this._finishedSpans.splice(0, this._maxExportBatchSize);
          }
          const doExport = () => this._exporter.export(spans, (result) => {
            clearTimeout(timer);
            if (result.code === ExportResultCode.SUCCESS) {
              resolve();
            } else {
              reject(result.error ?? new Error("BatchSpanProcessor: span export failed"));
            }
          });
          let pendingResources = null;
          for (let i = 0, len = spans.length; i < len; i++) {
            const span = spans[i];
            if (span.resource.asyncAttributesPending && span.resource.waitForAsyncAttributes) {
              pendingResources ??= [];
              pendingResources.push(span.resource.waitForAsyncAttributes());
            }
          }
          if (pendingResources === null) {
            doExport();
          } else {
            Promise.all(pendingResources).then(doExport, (err) => {
              globalErrorHandler(err);
              reject(err);
            });
          }
        });
      });
    }
    _maybeStartTimer() {
      if (this._isExporting)
        return;
      const flush = () => {
        this._isExporting = true;
        this._flushOneBatch().finally(() => {
          this._isExporting = false;
          if (this._finishedSpans.length > 0) {
            this._clearTimer();
            this._maybeStartTimer();
          }
        }).catch((e) => {
          this._isExporting = false;
          globalErrorHandler(e);
        });
      };
      if (this._finishedSpans.length >= this._maxExportBatchSize) {
        return flush();
      }
      if (this._timer !== void 0)
        return;
      this._timer = setTimeout(() => flush(), this._scheduledDelayMillis);
      if (typeof this._timer !== "number") {
        this._timer.unref();
      }
    }
    _clearTimer() {
      if (this._timer !== void 0) {
        clearTimeout(this._timer);
        this._timer = void 0;
      }
    }
  };

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/platform/browser/export/BatchSpanProcessor.js
  var BatchSpanProcessor = class extends BatchSpanProcessorBase {
    _visibilityChangeListener;
    _pageHideListener;
    constructor(_exporter, config) {
      super(_exporter, config);
      this.onInit(config);
    }
    onInit(config) {
      if (config?.disableAutoFlushOnDocumentHide !== true && typeof document !== "undefined") {
        this._visibilityChangeListener = () => {
          if (document.visibilityState === "hidden") {
            this.forceFlush().catch((error) => {
              globalErrorHandler(error);
            });
          }
        };
        this._pageHideListener = () => {
          this.forceFlush().catch((error) => {
            globalErrorHandler(error);
          });
        };
        document.addEventListener("visibilitychange", this._visibilityChangeListener);
        document.addEventListener("pagehide", this._pageHideListener);
      }
    }
    onShutdown() {
      if (typeof document !== "undefined") {
        if (this._visibilityChangeListener) {
          document.removeEventListener("visibilitychange", this._visibilityChangeListener);
        }
        if (this._pageHideListener) {
          document.removeEventListener("pagehide", this._pageHideListener);
        }
      }
    }
  };

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/platform/browser/RandomIdGenerator.js
  var SPAN_ID_BYTES = 8;
  var TRACE_ID_BYTES = 16;
  var RandomIdGenerator = class {
    /**
     * Returns a random 16-byte trace ID formatted/encoded as a 32 lowercase hex
     * characters corresponding to 128 bits.
     */
    generateTraceId = getIdGenerator(TRACE_ID_BYTES);
    /**
     * Returns a random 8-byte span ID formatted/encoded as a 16 lowercase hex
     * characters corresponding to 64 bits.
     */
    generateSpanId = getIdGenerator(SPAN_ID_BYTES);
  };
  var SHARED_CHAR_CODES_ARRAY = Array(32);
  function getIdGenerator(bytes) {
    return function generateId() {
      for (let i = 0; i < bytes * 2; i++) {
        SHARED_CHAR_CODES_ARRAY[i] = Math.floor(Math.random() * 16) + 48;
        if (SHARED_CHAR_CODES_ARRAY[i] >= 58) {
          SHARED_CHAR_CODES_ARRAY[i] += 39;
        }
      }
      return String.fromCharCode.apply(null, SHARED_CHAR_CODES_ARRAY.slice(0, bytes * 2));
    };
  }

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/Tracer.js
  var Tracer = class {
    _sampler;
    _generalLimits;
    _spanLimits;
    _idGenerator;
    instrumentationScope;
    _resource;
    _spanProcessor;
    /**
     * Constructs a new Tracer instance.
     */
    constructor(instrumentationScope, config, resource, spanProcessor) {
      const localConfig = mergeConfig(config);
      this._sampler = localConfig.sampler;
      this._generalLimits = localConfig.generalLimits;
      this._spanLimits = localConfig.spanLimits;
      this._idGenerator = config.idGenerator || new RandomIdGenerator();
      this._resource = resource;
      this._spanProcessor = spanProcessor;
      this.instrumentationScope = instrumentationScope;
    }
    /**
     * Starts a new Span or returns the default NoopSpan based on the sampling
     * decision.
     */
    startSpan(name, options = {}, context2 = context.active()) {
      if (options.root) {
        context2 = trace.deleteSpan(context2);
      }
      const parentSpan = trace.getSpan(context2);
      if (isTracingSuppressed(context2)) {
        diag2.debug("Instrumentation suppressed, returning Noop Span");
        const nonRecordingSpan = trace.wrapSpanContext(INVALID_SPAN_CONTEXT);
        return nonRecordingSpan;
      }
      const parentSpanContext = parentSpan?.spanContext();
      const spanId = this._idGenerator.generateSpanId();
      let validParentSpanContext;
      let traceId;
      let traceState;
      if (!parentSpanContext || !trace.isSpanContextValid(parentSpanContext)) {
        traceId = this._idGenerator.generateTraceId();
      } else {
        traceId = parentSpanContext.traceId;
        traceState = parentSpanContext.traceState;
        validParentSpanContext = parentSpanContext;
      }
      const spanKind = options.kind ?? SpanKind.INTERNAL;
      const links = (options.links ?? []).map((link) => {
        return {
          context: link.context,
          attributes: sanitizeAttributes(link.attributes)
        };
      });
      const attributes = sanitizeAttributes(options.attributes);
      const samplingResult = this._sampler.shouldSample(context2, traceId, name, spanKind, attributes, links);
      traceState = samplingResult.traceState ?? traceState;
      const traceFlags = samplingResult.decision === SamplingDecision.RECORD_AND_SAMPLED ? TraceFlags.SAMPLED : TraceFlags.NONE;
      const spanContext = { traceId, spanId, traceFlags, traceState };
      if (samplingResult.decision === SamplingDecision.NOT_RECORD) {
        diag2.debug("Recording is off, propagating context in a non-recording span");
        const nonRecordingSpan = trace.wrapSpanContext(spanContext);
        return nonRecordingSpan;
      }
      const initAttributes = sanitizeAttributes(Object.assign(attributes, samplingResult.attributes));
      const span = new SpanImpl({
        resource: this._resource,
        scope: this.instrumentationScope,
        context: context2,
        spanContext,
        name,
        kind: spanKind,
        links,
        parentSpanContext: validParentSpanContext,
        attributes: initAttributes,
        startTime: options.startTime,
        spanProcessor: this._spanProcessor,
        spanLimits: this._spanLimits
      });
      return span;
    }
    startActiveSpan(name, arg2, arg3, arg4) {
      let opts;
      let ctx;
      let fn;
      if (arguments.length < 2) {
        return;
      } else if (arguments.length === 2) {
        fn = arg2;
      } else if (arguments.length === 3) {
        opts = arg2;
        fn = arg3;
      } else {
        opts = arg2;
        ctx = arg3;
        fn = arg4;
      }
      const parentContext = ctx ?? context.active();
      const span = this.startSpan(name, opts, parentContext);
      const contextWithSpanSet = trace.setSpan(parentContext, span);
      return context.with(contextWithSpanSet, fn, void 0, span);
    }
    /** Returns the active {@link GeneralLimits}. */
    getGeneralLimits() {
      return this._generalLimits;
    }
    /** Returns the active {@link SpanLimits}. */
    getSpanLimits() {
      return this._spanLimits;
    }
  };

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/MultiSpanProcessor.js
  var MultiSpanProcessor = class {
    _spanProcessors;
    constructor(_spanProcessors) {
      this._spanProcessors = _spanProcessors;
    }
    forceFlush() {
      const promises = [];
      for (const spanProcessor of this._spanProcessors) {
        promises.push(spanProcessor.forceFlush());
      }
      return new Promise((resolve) => {
        Promise.all(promises).then(() => {
          resolve();
        }).catch((error) => {
          globalErrorHandler(error || new Error("MultiSpanProcessor: forceFlush failed"));
          resolve();
        });
      });
    }
    onStart(span, context2) {
      for (const spanProcessor of this._spanProcessors) {
        spanProcessor.onStart(span, context2);
      }
    }
    onEnd(span) {
      for (const spanProcessor of this._spanProcessors) {
        spanProcessor.onEnd(span);
      }
    }
    shutdown() {
      const promises = [];
      for (const spanProcessor of this._spanProcessors) {
        promises.push(spanProcessor.shutdown());
      }
      return new Promise((resolve, reject) => {
        Promise.all(promises).then(() => {
          resolve();
        }, reject);
      });
    }
  };

  // node_modules/@opentelemetry/sdk-trace-base/build/esm/BasicTracerProvider.js
  var ForceFlushState;
  (function(ForceFlushState2) {
    ForceFlushState2[ForceFlushState2["resolved"] = 0] = "resolved";
    ForceFlushState2[ForceFlushState2["timeout"] = 1] = "timeout";
    ForceFlushState2[ForceFlushState2["error"] = 2] = "error";
    ForceFlushState2[ForceFlushState2["unresolved"] = 3] = "unresolved";
  })(ForceFlushState || (ForceFlushState = {}));
  var BasicTracerProvider = class {
    _config;
    _tracers = /* @__PURE__ */ new Map();
    _resource;
    _activeSpanProcessor;
    constructor(config = {}) {
      const mergedConfig = merge({}, loadDefaultConfig2(), reconfigureLimits2(config));
      this._resource = mergedConfig.resource ?? defaultResource();
      this._config = Object.assign({}, mergedConfig, {
        resource: this._resource
      });
      const spanProcessors = [];
      if (config.spanProcessors?.length) {
        spanProcessors.push(...config.spanProcessors);
      }
      this._activeSpanProcessor = new MultiSpanProcessor(spanProcessors);
    }
    getTracer(name, version, options) {
      const key = `${name}@${version || ""}:${options?.schemaUrl || ""}`;
      if (!this._tracers.has(key)) {
        this._tracers.set(key, new Tracer({ name, version, schemaUrl: options?.schemaUrl }, this._config, this._resource, this._activeSpanProcessor));
      }
      return this._tracers.get(key);
    }
    forceFlush() {
      const timeout = this._config.forceFlushTimeoutMillis;
      const promises = this._activeSpanProcessor["_spanProcessors"].map((spanProcessor) => {
        return new Promise((resolve) => {
          let state;
          const timeoutInterval = setTimeout(() => {
            resolve(new Error(`Span processor did not completed within timeout period of ${timeout} ms`));
            state = ForceFlushState.timeout;
          }, timeout);
          spanProcessor.forceFlush().then(() => {
            clearTimeout(timeoutInterval);
            if (state !== ForceFlushState.timeout) {
              state = ForceFlushState.resolved;
              resolve(state);
            }
          }).catch((error) => {
            clearTimeout(timeoutInterval);
            state = ForceFlushState.error;
            resolve(error);
          });
        });
      });
      return new Promise((resolve, reject) => {
        Promise.all(promises).then((results) => {
          const errors = results.filter((result) => result !== ForceFlushState.resolved);
          if (errors.length > 0) {
            reject(errors);
          } else {
            resolve();
          }
        }).catch((error) => reject([error]));
      });
    }
    shutdown() {
      return this._activeSpanProcessor.shutdown();
    }
  };

  // node_modules/@opentelemetry/sdk-trace-web/build/esm/StackContextManager.js
  var StackContextManager = class {
    /**
     * whether the context manager is enabled or not
     */
    _enabled = false;
    /**
     * Keeps the reference to current context
     */
    _currentContext = ROOT_CONTEXT;
    /**
     *
     * @param context
     * @param target Function to be executed within the context
     */
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    _bindFunction(context2 = ROOT_CONTEXT, target) {
      const manager = this;
      const contextWrapper = function(...args) {
        return manager.with(context2, () => target.apply(this, args));
      };
      Object.defineProperty(contextWrapper, "length", {
        enumerable: false,
        configurable: true,
        writable: false,
        value: target.length
      });
      return contextWrapper;
    }
    /**
     * Returns the active context
     */
    active() {
      return this._currentContext;
    }
    /**
     * Binds a the certain context or the active one to the target function and then returns the target
     * @param context A context (span) to be bind to target
     * @param target a function or event emitter. When target or one of its callbacks is called,
     *  the provided context will be used as the active context for the duration of the call.
     */
    bind(context2, target) {
      if (context2 === void 0) {
        context2 = this.active();
      }
      if (typeof target === "function") {
        return this._bindFunction(context2, target);
      }
      return target;
    }
    /**
     * Disable the context manager (clears the current context)
     */
    disable() {
      this._currentContext = ROOT_CONTEXT;
      this._enabled = false;
      return this;
    }
    /**
     * Enables the context manager and creates a default(root) context
     */
    enable() {
      if (this._enabled) {
        return this;
      }
      this._enabled = true;
      this._currentContext = ROOT_CONTEXT;
      return this;
    }
    /**
     * Calls the callback function [fn] with the provided [context]. If [context] is undefined then it will use the window.
     * The context will be set as active
     * @param context
     * @param fn Callback function
     * @param thisArg optional receiver to be used for calling fn
     * @param args optional arguments forwarded to fn
     */
    with(context2, fn, thisArg, ...args) {
      const previousContext = this._currentContext;
      this._currentContext = context2 || ROOT_CONTEXT;
      try {
        return fn.call(thisArg, ...args);
      } finally {
        this._currentContext = previousContext;
      }
    }
  };

  // node_modules/@opentelemetry/sdk-trace-web/build/esm/WebTracerProvider.js
  function setupContextManager(contextManager) {
    if (contextManager === null) {
      return;
    }
    if (contextManager === void 0) {
      const defaultContextManager = new StackContextManager();
      defaultContextManager.enable();
      context.setGlobalContextManager(defaultContextManager);
      return;
    }
    contextManager.enable();
    context.setGlobalContextManager(contextManager);
  }
  function setupPropagator(propagator) {
    if (propagator === null) {
      return;
    }
    if (propagator === void 0) {
      propagation.setGlobalPropagator(new CompositePropagator({
        propagators: [
          new W3CTraceContextPropagator(),
          new W3CBaggagePropagator()
        ]
      }));
      return;
    }
    propagation.setGlobalPropagator(propagator);
  }
  var WebTracerProvider = class extends BasicTracerProvider {
    /**
     * Constructs a new Tracer instance.
     * @param config Web Tracer config
     */
    constructor(config = {}) {
      super(config);
    }
    /**
     * Register this TracerProvider for use with the OpenTelemetry API.
     * Undefined values may be replaced with defaults, and
     * null values will be skipped.
     *
     * @param config Configuration object for SDK registration
     */
    register(config = {}) {
      trace.setGlobalTracerProvider(this);
      setupPropagator(config.propagator);
      setupContextManager(config.contextManager);
    }
  };

  // node_modules/@opentelemetry/sdk-trace-web/build/esm/enums/PerformanceTimingNames.js
  var PerformanceTimingNames;
  (function(PerformanceTimingNames2) {
    PerformanceTimingNames2["CONNECT_END"] = "connectEnd";
    PerformanceTimingNames2["CONNECT_START"] = "connectStart";
    PerformanceTimingNames2["DECODED_BODY_SIZE"] = "decodedBodySize";
    PerformanceTimingNames2["DOM_COMPLETE"] = "domComplete";
    PerformanceTimingNames2["DOM_CONTENT_LOADED_EVENT_END"] = "domContentLoadedEventEnd";
    PerformanceTimingNames2["DOM_CONTENT_LOADED_EVENT_START"] = "domContentLoadedEventStart";
    PerformanceTimingNames2["DOM_INTERACTIVE"] = "domInteractive";
    PerformanceTimingNames2["DOMAIN_LOOKUP_END"] = "domainLookupEnd";
    PerformanceTimingNames2["DOMAIN_LOOKUP_START"] = "domainLookupStart";
    PerformanceTimingNames2["ENCODED_BODY_SIZE"] = "encodedBodySize";
    PerformanceTimingNames2["FETCH_START"] = "fetchStart";
    PerformanceTimingNames2["LOAD_EVENT_END"] = "loadEventEnd";
    PerformanceTimingNames2["LOAD_EVENT_START"] = "loadEventStart";
    PerformanceTimingNames2["NAVIGATION_START"] = "navigationStart";
    PerformanceTimingNames2["REDIRECT_END"] = "redirectEnd";
    PerformanceTimingNames2["REDIRECT_START"] = "redirectStart";
    PerformanceTimingNames2["REQUEST_START"] = "requestStart";
    PerformanceTimingNames2["RESPONSE_END"] = "responseEnd";
    PerformanceTimingNames2["RESPONSE_START"] = "responseStart";
    PerformanceTimingNames2["SECURE_CONNECTION_START"] = "secureConnectionStart";
    PerformanceTimingNames2["START_TIME"] = "startTime";
    PerformanceTimingNames2["UNLOAD_EVENT_END"] = "unloadEventEnd";
    PerformanceTimingNames2["UNLOAD_EVENT_START"] = "unloadEventStart";
  })(PerformanceTimingNames || (PerformanceTimingNames = {}));

  // node_modules/@opentelemetry/sdk-trace-web/build/esm/semconv.js
  var ATTR_HTTP_RESPONSE_CONTENT_LENGTH = "http.response_content_length";
  var ATTR_HTTP_RESPONSE_CONTENT_LENGTH_UNCOMPRESSED = "http.response_content_length_uncompressed";

  // node_modules/@opentelemetry/sdk-trace-web/build/esm/utils.js
  var urlNormalizingAnchor;
  function getUrlNormalizingAnchor() {
    if (!urlNormalizingAnchor) {
      urlNormalizingAnchor = document.createElement("a");
    }
    return urlNormalizingAnchor;
  }
  function hasKey(obj, key) {
    return key in obj;
  }
  function addSpanNetworkEvent(span, performanceName, entries, ignoreZeros = true) {
    if (hasKey(entries, performanceName) && typeof entries[performanceName] === "number" && !(ignoreZeros && entries[performanceName] === 0)) {
      return span.addEvent(performanceName, entries[performanceName]);
    }
    return void 0;
  }
  function addSpanNetworkEvents(span, resource, ignoreNetworkEvents = false, ignoreZeros, skipOldSemconvContentLengthAttrs) {
    if (ignoreZeros === void 0) {
      ignoreZeros = resource[PerformanceTimingNames.START_TIME] !== 0;
    }
    if (!ignoreNetworkEvents) {
      addSpanNetworkEvent(span, PerformanceTimingNames.FETCH_START, resource, ignoreZeros);
      addSpanNetworkEvent(span, PerformanceTimingNames.DOMAIN_LOOKUP_START, resource, ignoreZeros);
      addSpanNetworkEvent(span, PerformanceTimingNames.DOMAIN_LOOKUP_END, resource, ignoreZeros);
      addSpanNetworkEvent(span, PerformanceTimingNames.CONNECT_START, resource, ignoreZeros);
      addSpanNetworkEvent(span, PerformanceTimingNames.SECURE_CONNECTION_START, resource, ignoreZeros);
      addSpanNetworkEvent(span, PerformanceTimingNames.CONNECT_END, resource, ignoreZeros);
      addSpanNetworkEvent(span, PerformanceTimingNames.REQUEST_START, resource, ignoreZeros);
      addSpanNetworkEvent(span, PerformanceTimingNames.RESPONSE_START, resource, ignoreZeros);
      addSpanNetworkEvent(span, PerformanceTimingNames.RESPONSE_END, resource, ignoreZeros);
    }
    if (!skipOldSemconvContentLengthAttrs) {
      const encodedLength = resource[PerformanceTimingNames.ENCODED_BODY_SIZE];
      if (encodedLength !== void 0) {
        span.setAttribute(ATTR_HTTP_RESPONSE_CONTENT_LENGTH, encodedLength);
      }
      const decodedLength = resource[PerformanceTimingNames.DECODED_BODY_SIZE];
      if (decodedLength !== void 0 && encodedLength !== decodedLength) {
        span.setAttribute(ATTR_HTTP_RESPONSE_CONTENT_LENGTH_UNCOMPRESSED, decodedLength);
      }
    }
  }
  function sortResources(filteredResources) {
    return filteredResources.slice().sort((a, b) => {
      const valueA = a[PerformanceTimingNames.FETCH_START];
      const valueB = b[PerformanceTimingNames.FETCH_START];
      if (valueA > valueB) {
        return 1;
      } else if (valueA < valueB) {
        return -1;
      }
      return 0;
    });
  }
  function getOrigin() {
    return typeof location !== "undefined" ? location.origin : void 0;
  }
  function getResource(spanUrl, startTimeHR, endTimeHR, resources, ignoredResources = /* @__PURE__ */ new WeakSet(), initiatorType) {
    const parsedSpanUrl = parseUrl(spanUrl);
    spanUrl = parsedSpanUrl.toString();
    const filteredResources = filterResourcesForSpan(spanUrl, startTimeHR, endTimeHR, resources, ignoredResources, initiatorType);
    if (filteredResources.length === 0) {
      return {
        mainRequest: void 0
      };
    }
    if (filteredResources.length === 1) {
      return {
        mainRequest: filteredResources[0]
      };
    }
    const sorted = sortResources(filteredResources);
    if (parsedSpanUrl.origin !== getOrigin() && sorted.length > 1) {
      let corsPreFlightRequest = sorted[0];
      let mainRequest = findMainRequest(sorted, corsPreFlightRequest[PerformanceTimingNames.RESPONSE_END], endTimeHR);
      const responseEnd = corsPreFlightRequest[PerformanceTimingNames.RESPONSE_END];
      const fetchStart = mainRequest[PerformanceTimingNames.FETCH_START];
      if (fetchStart < responseEnd) {
        mainRequest = corsPreFlightRequest;
        corsPreFlightRequest = void 0;
      }
      return {
        corsPreFlightRequest,
        mainRequest
      };
    } else {
      return {
        mainRequest: filteredResources[0]
      };
    }
  }
  function findMainRequest(resources, corsPreFlightRequestEndTime, spanEndTimeHR) {
    const spanEndTime = hrTimeToNanoseconds(spanEndTimeHR);
    const minTime = hrTimeToNanoseconds(timeInputToHrTime(corsPreFlightRequestEndTime));
    let mainRequest = resources[1];
    let bestGap;
    const length = resources.length;
    for (let i = 1; i < length; i++) {
      const resource = resources[i];
      const resourceStartTime = hrTimeToNanoseconds(timeInputToHrTime(resource[PerformanceTimingNames.FETCH_START]));
      const resourceEndTime = hrTimeToNanoseconds(timeInputToHrTime(resource[PerformanceTimingNames.RESPONSE_END]));
      const currentGap = spanEndTime - resourceEndTime;
      if (resourceStartTime >= minTime && (!bestGap || currentGap < bestGap)) {
        bestGap = currentGap;
        mainRequest = resource;
      }
    }
    return mainRequest;
  }
  function filterResourcesForSpan(spanUrl, startTimeHR, endTimeHR, resources, ignoredResources, initiatorType) {
    const startTime = hrTimeToNanoseconds(startTimeHR);
    const endTime = hrTimeToNanoseconds(endTimeHR);
    let filteredResources = resources.filter((resource) => {
      const resourceStartTime = hrTimeToNanoseconds(timeInputToHrTime(resource[PerformanceTimingNames.FETCH_START]));
      const resourceEndTime = hrTimeToNanoseconds(timeInputToHrTime(resource[PerformanceTimingNames.RESPONSE_END]));
      return resource.initiatorType.toLowerCase() === (initiatorType || "xmlhttprequest") && resource.name === spanUrl && resourceStartTime >= startTime && resourceEndTime <= endTime;
    });
    if (filteredResources.length > 0) {
      filteredResources = filteredResources.filter((resource) => {
        return !ignoredResources.has(resource);
      });
    }
    return filteredResources;
  }
  function parseUrl(url) {
    if (typeof URL === "function") {
      return new URL(url, typeof document !== "undefined" ? document.baseURI : typeof location !== "undefined" ? location.href : void 0);
    }
    const element = getUrlNormalizingAnchor();
    element.href = url;
    return element;
  }
  function getElementXPath(target, optimised) {
    if (target.nodeType === Node.DOCUMENT_NODE) {
      return "/";
    }
    const targetValue = getNodeValue(target, optimised);
    if (optimised && targetValue.indexOf("@id") > 0) {
      return targetValue;
    }
    let xpath = "";
    if (target.parentNode) {
      xpath += getElementXPath(target.parentNode, false);
    }
    xpath += targetValue;
    return xpath;
  }
  function getNodeIndex(target) {
    if (!target.parentNode) {
      return 0;
    }
    const allowedTypes = [target.nodeType];
    if (target.nodeType === Node.CDATA_SECTION_NODE) {
      allowedTypes.push(Node.TEXT_NODE);
    }
    let elements = Array.from(target.parentNode.childNodes);
    elements = elements.filter((element) => {
      const localName = element.localName;
      return allowedTypes.indexOf(element.nodeType) >= 0 && localName === target.localName;
    });
    if (elements.length >= 1) {
      return elements.indexOf(target) + 1;
    }
    return 0;
  }
  function getNodeValue(target, optimised) {
    const nodeType = target.nodeType;
    const index = getNodeIndex(target);
    let nodeValue = "";
    if (nodeType === Node.ELEMENT_NODE) {
      const id = target.getAttribute("id");
      if (optimised && id) {
        return `//*[@id="${id}"]`;
      }
      nodeValue = target.localName;
    } else if (nodeType === Node.TEXT_NODE || nodeType === Node.CDATA_SECTION_NODE) {
      nodeValue = "text()";
    } else if (nodeType === Node.COMMENT_NODE) {
      nodeValue = "comment()";
    } else {
      return "";
    }
    if (nodeValue && index > 1) {
      return `/${nodeValue}[${index}]`;
    }
    return `/${nodeValue}`;
  }
  function shouldPropagateTraceHeaders(spanUrl, propagateTraceHeaderCorsUrls) {
    let propagateTraceHeaderUrls = propagateTraceHeaderCorsUrls || [];
    if (typeof propagateTraceHeaderUrls === "string" || propagateTraceHeaderUrls instanceof RegExp) {
      propagateTraceHeaderUrls = [propagateTraceHeaderUrls];
    }
    const parsedSpanUrl = parseUrl(spanUrl);
    if (parsedSpanUrl.origin === getOrigin()) {
      return true;
    } else {
      return propagateTraceHeaderUrls.some((propagateTraceHeaderUrl) => urlMatches(spanUrl, propagateTraceHeaderUrl));
    }
  }

  // node_modules/@opentelemetry/instrumentation/build/esm/autoLoaderUtils.js
  function enableInstrumentations(instrumentations, tracerProvider, meterProvider, loggerProvider) {
    for (let i = 0, j = instrumentations.length; i < j; i++) {
      const instrumentation = instrumentations[i];
      if (tracerProvider) {
        instrumentation.setTracerProvider(tracerProvider);
      }
      if (meterProvider) {
        instrumentation.setMeterProvider(meterProvider);
      }
      if (loggerProvider && instrumentation.setLoggerProvider) {
        instrumentation.setLoggerProvider(loggerProvider);
      }
      if (!instrumentation.getConfig().enabled) {
        instrumentation.enable();
      }
    }
  }
  function disableInstrumentations(instrumentations) {
    instrumentations.forEach((instrumentation) => instrumentation.disable());
  }

  // node_modules/@opentelemetry/instrumentation/build/esm/autoLoader.js
  function registerInstrumentations(options) {
    const tracerProvider = options.tracerProvider || trace.getTracerProvider();
    const meterProvider = options.meterProvider || metrics.getMeterProvider();
    const loggerProvider = options.loggerProvider || logs.getLoggerProvider();
    const instrumentations = options.instrumentations?.flat() ?? [];
    enableInstrumentations(instrumentations, tracerProvider, meterProvider, loggerProvider);
    return () => {
      disableInstrumentations(instrumentations);
    };
  }

  // node_modules/@opentelemetry/instrumentation/build/esm/shimmer.js
  var logger = console.error.bind(console);
  function defineProperty(obj, name, value) {
    const enumerable = !!obj[name] && Object.prototype.propertyIsEnumerable.call(obj, name);
    Object.defineProperty(obj, name, {
      configurable: true,
      enumerable,
      writable: true,
      value
    });
  }
  var wrap = (nodule, name, wrapper) => {
    if (!nodule || !nodule[name]) {
      logger("no original function " + String(name) + " to wrap");
      return;
    }
    if (!wrapper) {
      logger("no wrapper function");
      logger(new Error().stack);
      return;
    }
    const original = nodule[name];
    if (typeof original !== "function" || typeof wrapper !== "function") {
      logger("original object and wrapper must be functions");
      return;
    }
    const wrapped = wrapper(original, name);
    defineProperty(wrapped, "__original", original);
    defineProperty(wrapped, "__unwrap", () => {
      if (nodule[name] === wrapped) {
        defineProperty(nodule, name, original);
      }
    });
    defineProperty(wrapped, "__wrapped", true);
    defineProperty(nodule, name, wrapped);
    return wrapped;
  };
  var massWrap = (nodules, names, wrapper) => {
    if (!nodules) {
      logger("must provide one or more modules to patch");
      logger(new Error().stack);
      return;
    } else if (!Array.isArray(nodules)) {
      nodules = [nodules];
    }
    if (!(names && Array.isArray(names))) {
      logger("must provide one or more functions to wrap on modules");
      return;
    }
    nodules.forEach((nodule) => {
      names.forEach((name) => {
        wrap(nodule, name, wrapper);
      });
    });
  };
  var unwrap = (nodule, name) => {
    if (!nodule || !nodule[name]) {
      logger("no function to unwrap.");
      logger(new Error().stack);
      return;
    }
    const wrapped = nodule[name];
    if (!wrapped.__unwrap) {
      logger("no original to unwrap to -- has " + String(name) + " already been unwrapped?");
    } else {
      wrapped.__unwrap();
      return;
    }
  };
  var massUnwrap = (nodules, names) => {
    if (!nodules) {
      logger("must provide one or more modules to patch");
      logger(new Error().stack);
      return;
    } else if (!Array.isArray(nodules)) {
      nodules = [nodules];
    }
    if (!(names && Array.isArray(names))) {
      logger("must provide one or more functions to unwrap on modules");
      return;
    }
    nodules.forEach((nodule) => {
      names.forEach((name) => {
        unwrap(nodule, name);
      });
    });
  };
  function shimmer(options) {
    if (options && options.logger) {
      if (typeof options.logger !== "function") {
        logger("new logger isn't a function, not replacing");
      } else {
        logger = options.logger;
      }
    }
  }
  shimmer.wrap = wrap;
  shimmer.massWrap = massWrap;
  shimmer.unwrap = unwrap;
  shimmer.massUnwrap = massUnwrap;

  // node_modules/@opentelemetry/instrumentation/build/esm/instrumentation.js
  var InstrumentationAbstract = class {
    instrumentationName;
    instrumentationVersion;
    _config = {};
    _tracer;
    _meter;
    _logger;
    _diag;
    constructor(instrumentationName, instrumentationVersion, config) {
      this.instrumentationName = instrumentationName;
      this.instrumentationVersion = instrumentationVersion;
      this.setConfig(config);
      this._diag = diag2.createComponentLogger({
        namespace: instrumentationName
      });
      this._tracer = trace.getTracer(instrumentationName, instrumentationVersion);
      this._meter = metrics.getMeter(instrumentationName, instrumentationVersion);
      this._logger = logs.getLogger(instrumentationName, instrumentationVersion);
      this._updateMetricInstruments();
    }
    /* Api to wrap instrumented method */
    _wrap = wrap;
    /* Api to unwrap instrumented methods */
    _unwrap = unwrap;
    /* Api to mass wrap instrumented method */
    _massWrap = massWrap;
    /* Api to mass unwrap instrumented methods */
    _massUnwrap = massUnwrap;
    /* Returns meter */
    get meter() {
      return this._meter;
    }
    /**
     * Sets MeterProvider to this plugin
     * @param meterProvider
     */
    setMeterProvider(meterProvider) {
      this._meter = meterProvider.getMeter(this.instrumentationName, this.instrumentationVersion);
      this._updateMetricInstruments();
    }
    /* Returns logger */
    get logger() {
      return this._logger;
    }
    /**
     * Sets LoggerProvider to this plugin
     * @param loggerProvider
     */
    setLoggerProvider(loggerProvider) {
      this._logger = loggerProvider.getLogger(this.instrumentationName, this.instrumentationVersion);
    }
    /**
     * @experimental
     *
     * Get module definitions defined by {@link init}.
     * This can be used for experimental compile-time instrumentation.
     *
     * @returns an array of {@link InstrumentationModuleDefinition}
     */
    getModuleDefinitions() {
      const initResult = this.init() ?? [];
      if (!Array.isArray(initResult)) {
        return [initResult];
      }
      return initResult;
    }
    /**
     * Sets the new metric instruments with the current Meter.
     */
    _updateMetricInstruments() {
      return;
    }
    /* Returns InstrumentationConfig */
    getConfig() {
      return this._config;
    }
    /**
     * Sets InstrumentationConfig to this plugin
     * @param config
     */
    setConfig(config) {
      this._config = {
        enabled: true,
        ...config
      };
    }
    /**
     * Sets TraceProvider to this plugin
     * @param tracerProvider
     */
    setTracerProvider(tracerProvider) {
      this._tracer = tracerProvider.getTracer(this.instrumentationName, this.instrumentationVersion);
    }
    /* Returns tracer */
    get tracer() {
      return this._tracer;
    }
    /**
     * Execute span customization hook, if configured, and log any errors.
     * Any semantics of the trigger and info are defined by the specific instrumentation.
     * @param hookHandler The optional hook handler which the user has configured via instrumentation config
     * @param triggerName The name of the trigger for executing the hook for logging purposes
     * @param span The span to which the hook should be applied
     * @param info The info object to be passed to the hook, with useful data the hook may use
     */
    _runSpanCustomizationHook(hookHandler, triggerName, span, info) {
      if (!hookHandler) {
        return;
      }
      try {
        hookHandler(span, info);
      } catch (e) {
        this._diag.error(`Error running span customization hook due to exception in handler`, { triggerName }, e);
      }
    }
  };

  // node_modules/@opentelemetry/instrumentation/build/esm/platform/browser/instrumentation.js
  var InstrumentationBase = class extends InstrumentationAbstract {
    constructor(instrumentationName, instrumentationVersion, config) {
      super(instrumentationName, instrumentationVersion, config);
      if (this._config.enabled) {
        this.enable();
      }
    }
  };

  // node_modules/@opentelemetry/instrumentation/build/esm/utils.js
  function safeExecuteInTheMiddle(execute, onFinish, preventThrowingError) {
    let error;
    let result;
    try {
      result = execute();
    } catch (e) {
      error = e;
    } finally {
      onFinish(error, result);
      if (error && !preventThrowingError) {
        throw error;
      }
      return result;
    }
  }
  function isWrapped(func) {
    return typeof func === "function" && typeof func.__original === "function" && typeof func.__unwrap === "function" && func.__wrapped === true;
  }

  // node_modules/@opentelemetry/instrumentation/build/esm/semconvStability.js
  var SemconvStability;
  (function(SemconvStability2) {
    SemconvStability2[SemconvStability2["STABLE"] = 1] = "STABLE";
    SemconvStability2[SemconvStability2["OLD"] = 2] = "OLD";
    SemconvStability2[SemconvStability2["DUPLICATE"] = 3] = "DUPLICATE";
  })(SemconvStability || (SemconvStability = {}));
  function semconvStabilityFromStr(namespace, str) {
    let semconvStability = SemconvStability.OLD;
    const entries = str?.split(",").map((v) => v.trim()).filter((s) => s !== "");
    for (const entry of entries ?? []) {
      if (entry.toLowerCase() === namespace + "/dup") {
        semconvStability = SemconvStability.DUPLICATE;
        break;
      } else if (entry.toLowerCase() === namespace) {
        semconvStability = SemconvStability.STABLE;
      }
    }
    return semconvStability;
  }

  // node_modules/@opentelemetry/instrumentation-document-load/build/esm/enums/AttributeNames.js
  var AttributeNames;
  (function(AttributeNames5) {
    AttributeNames5["DOCUMENT_LOAD"] = "documentLoad";
    AttributeNames5["DOCUMENT_FETCH"] = "documentFetch";
    AttributeNames5["RESOURCE_FETCH"] = "resourceFetch";
  })(AttributeNames || (AttributeNames = {}));

  // node_modules/@opentelemetry/instrumentation-document-load/build/esm/version.js
  var PACKAGE_VERSION = "0.54.0";
  var PACKAGE_NAME = "@opentelemetry/instrumentation-document-load";

  // node_modules/@opentelemetry/instrumentation-document-load/build/esm/semconv.js
  var ATTR_HTTP_URL = "http.url";
  var ATTR_HTTP_USER_AGENT = "http.user_agent";

  // node_modules/@opentelemetry/instrumentation-document-load/build/esm/enums/EventNames.js
  var EventNames;
  (function(EventNames3) {
    EventNames3["FIRST_PAINT"] = "firstPaint";
    EventNames3["FIRST_CONTENTFUL_PAINT"] = "firstContentfulPaint";
  })(EventNames || (EventNames = {}));

  // node_modules/@opentelemetry/instrumentation-document-load/build/esm/utils.js
  var getPerformanceNavigationEntries = () => {
    const entries = {};
    const performanceNavigationTiming = otperformance.getEntriesByType?.("navigation")[0];
    if (performanceNavigationTiming) {
      const keys = Object.values(PerformanceTimingNames);
      keys.forEach((key) => {
        if (hasKey(performanceNavigationTiming, key)) {
          const value = performanceNavigationTiming[key];
          if (typeof value === "number") {
            entries[key] = value;
          }
        }
      });
    } else {
      const perf = otperformance;
      const performanceTiming = perf.timing;
      if (performanceTiming) {
        const keys = Object.values(PerformanceTimingNames);
        keys.forEach((key) => {
          if (hasKey(performanceTiming, key)) {
            const value = performanceTiming[key];
            if (typeof value === "number") {
              entries[key] = value;
            }
          }
        });
      }
    }
    return entries;
  };
  var performancePaintNames = {
    "first-paint": EventNames.FIRST_PAINT,
    "first-contentful-paint": EventNames.FIRST_CONTENTFUL_PAINT
  };
  var addSpanPerformancePaintEvents = (span) => {
    const performancePaintTiming = otperformance.getEntriesByType?.("paint");
    if (performancePaintTiming) {
      performancePaintTiming.forEach(({ name, startTime }) => {
        if (hasKey(performancePaintNames, name)) {
          span.addEvent(performancePaintNames[name], startTime);
        }
      });
    }
  };

  // node_modules/@opentelemetry/instrumentation-document-load/build/esm/instrumentation.js
  var DocumentLoadInstrumentation = class extends InstrumentationBase {
    component = "document-load";
    version = "1";
    moduleName = this.component;
    _semconvStability;
    constructor(config = {}) {
      super(PACKAGE_NAME, PACKAGE_VERSION, config);
      this._semconvStability = semconvStabilityFromStr("http", config?.semconvStabilityOptIn);
    }
    init() {
    }
    /**
     * callback to be executed when page is loaded
     */
    _onDocumentLoaded() {
      window.setTimeout(() => {
        this._collectPerformance();
      });
    }
    /**
     * Adds spans for all resources
     * @param rootSpan
     */
    _addResourcesSpans(rootSpan) {
      const resources = otperformance.getEntriesByType?.("resource");
      if (resources) {
        resources.forEach((resource) => {
          this._initResourceSpan(resource, rootSpan);
        });
      }
    }
    /**
     * Collects information about performance and creates appropriate spans
     */
    _collectPerformance() {
      const metaElement = Array.from(document.getElementsByTagName("meta")).find((e) => e.getAttribute("name") === TRACE_PARENT_HEADER);
      const entries = getPerformanceNavigationEntries();
      const traceparent = metaElement && metaElement.content || "";
      context.with(propagation.extract(ROOT_CONTEXT, { traceparent }), () => {
        const rootSpan = this._startSpan(AttributeNames.DOCUMENT_LOAD, PerformanceTimingNames.FETCH_START, entries);
        if (!rootSpan) {
          return;
        }
        context.with(trace.setSpan(context.active(), rootSpan), () => {
          const fetchSpan = this._startSpan(AttributeNames.DOCUMENT_FETCH, PerformanceTimingNames.FETCH_START, entries);
          if (fetchSpan) {
            if (this._semconvStability & SemconvStability.OLD) {
              fetchSpan.setAttribute(ATTR_HTTP_URL, location.href);
            }
            if (this._semconvStability & SemconvStability.STABLE) {
              fetchSpan.setAttribute(ATTR_URL_FULL, location.href);
            }
            context.with(trace.setSpan(context.active(), fetchSpan), () => {
              const skipOldSemconvContentLengthAttrs = !(this._semconvStability & SemconvStability.OLD);
              addSpanNetworkEvents(fetchSpan, entries, this.getConfig().ignoreNetworkEvents, void 0, skipOldSemconvContentLengthAttrs);
              this._addCustomAttributesOnSpan(fetchSpan, this.getConfig().applyCustomAttributesOnSpan?.documentFetch);
              this._endSpan(fetchSpan, PerformanceTimingNames.RESPONSE_END, entries);
            });
          }
        });
        if (this._semconvStability & SemconvStability.OLD) {
          rootSpan.setAttribute(ATTR_HTTP_URL, location.href);
          rootSpan.setAttribute(ATTR_HTTP_USER_AGENT, navigator.userAgent);
        }
        if (this._semconvStability & SemconvStability.STABLE) {
          rootSpan.setAttribute(ATTR_URL_FULL, location.href);
          rootSpan.setAttribute(ATTR_USER_AGENT_ORIGINAL, navigator.userAgent);
        }
        this._addResourcesSpans(rootSpan);
        if (!this.getConfig().ignoreNetworkEvents) {
          addSpanNetworkEvent(rootSpan, PerformanceTimingNames.FETCH_START, entries);
          addSpanNetworkEvent(rootSpan, PerformanceTimingNames.UNLOAD_EVENT_START, entries);
          addSpanNetworkEvent(rootSpan, PerformanceTimingNames.UNLOAD_EVENT_END, entries);
          addSpanNetworkEvent(rootSpan, PerformanceTimingNames.DOM_INTERACTIVE, entries);
          addSpanNetworkEvent(rootSpan, PerformanceTimingNames.DOM_CONTENT_LOADED_EVENT_START, entries);
          addSpanNetworkEvent(rootSpan, PerformanceTimingNames.DOM_CONTENT_LOADED_EVENT_END, entries);
          addSpanNetworkEvent(rootSpan, PerformanceTimingNames.DOM_COMPLETE, entries);
          addSpanNetworkEvent(rootSpan, PerformanceTimingNames.LOAD_EVENT_START, entries);
          addSpanNetworkEvent(rootSpan, PerformanceTimingNames.LOAD_EVENT_END, entries);
        }
        if (!this.getConfig().ignorePerformancePaintEvents) {
          addSpanPerformancePaintEvents(rootSpan);
        }
        this._addCustomAttributesOnSpan(rootSpan, this.getConfig().applyCustomAttributesOnSpan?.documentLoad);
        this._endSpan(rootSpan, PerformanceTimingNames.LOAD_EVENT_END, entries);
      });
    }
    /**
     * Helper function for ending span
     * @param span
     * @param performanceName name of performance entry for time end
     * @param entries
     */
    _endSpan(span, performanceName, entries) {
      if (span) {
        if (hasKey(entries, performanceName)) {
          span.end(entries[performanceName]);
        } else {
          span.end();
        }
      }
    }
    /**
     * Creates and ends a span with network information about resource added as timed events
     * @param resource
     * @param parentSpan
     */
    _initResourceSpan(resource, parentSpan) {
      const span = this._startSpan(AttributeNames.RESOURCE_FETCH, PerformanceTimingNames.FETCH_START, resource, parentSpan);
      if (span) {
        if (this._semconvStability & SemconvStability.OLD) {
          span.setAttribute(ATTR_HTTP_URL, resource.name);
        }
        if (this._semconvStability & SemconvStability.STABLE) {
          span.setAttribute(ATTR_URL_FULL, resource.name);
        }
        const skipOldSemconvContentLengthAttrs = !(this._semconvStability & SemconvStability.OLD);
        addSpanNetworkEvents(span, resource, this.getConfig().ignoreNetworkEvents, void 0, skipOldSemconvContentLengthAttrs);
        this._addCustomAttributesOnResourceSpan(span, resource, this.getConfig().applyCustomAttributesOnSpan?.resourceFetch);
        this._endSpan(span, PerformanceTimingNames.RESPONSE_END, resource);
      }
    }
    /**
     * Helper function for starting a span
     * @param spanName name of span
     * @param performanceName name of performance entry for time start
     * @param entries
     * @param parentSpan
     */
    _startSpan(spanName, performanceName, entries, parentSpan) {
      if (hasKey(entries, performanceName) && typeof entries[performanceName] === "number") {
        const span = this.tracer.startSpan(spanName, {
          startTime: entries[performanceName]
        }, parentSpan ? trace.setSpan(context.active(), parentSpan) : void 0);
        return span;
      }
      return void 0;
    }
    /**
     * executes callback {_onDocumentLoaded} when the page is loaded
     */
    _waitForPageLoad() {
      if (window.document.readyState === "complete") {
        this._onDocumentLoaded();
      } else {
        this._onDocumentLoaded = this._onDocumentLoaded.bind(this);
        window.addEventListener("load", this._onDocumentLoaded);
      }
    }
    /**
     * adds custom attributes to root span if configured
     */
    _addCustomAttributesOnSpan(span, applyCustomAttributesOnSpan) {
      if (applyCustomAttributesOnSpan) {
        safeExecuteInTheMiddle(() => applyCustomAttributesOnSpan(span), (error) => {
          if (!error) {
            return;
          }
          this._diag.error("addCustomAttributesOnSpan", error);
        }, true);
      }
    }
    /**
     * adds custom attributes to span if configured
     */
    _addCustomAttributesOnResourceSpan(span, resource, applyCustomAttributesOnSpan) {
      if (applyCustomAttributesOnSpan) {
        safeExecuteInTheMiddle(() => applyCustomAttributesOnSpan(span, resource), (error) => {
          if (!error) {
            return;
          }
          this._diag.error("addCustomAttributesOnResourceSpan", error);
        }, true);
      }
    }
    /**
     * implements enable function
     */
    enable() {
      window.removeEventListener("load", this._onDocumentLoaded);
      this._waitForPageLoad();
    }
    /**
     * implements disable function
     */
    disable() {
      window.removeEventListener("load", this._onDocumentLoaded);
    }
  };

  // node_modules/@opentelemetry/instrumentation-fetch/build/esm/enums/AttributeNames.js
  var AttributeNames2;
  (function(AttributeNames5) {
    AttributeNames5["COMPONENT"] = "component";
    AttributeNames5["HTTP_STATUS_TEXT"] = "http.status_text";
  })(AttributeNames2 || (AttributeNames2 = {}));

  // node_modules/@opentelemetry/instrumentation-fetch/build/esm/semconv.js
  var ATTR_HTTP_HOST = "http.host";
  var ATTR_HTTP_METHOD = "http.method";
  var ATTR_HTTP_REQUEST_BODY_SIZE = "http.request.body.size";
  var ATTR_HTTP_REQUEST_CONTENT_LENGTH_UNCOMPRESSED = "http.request_content_length_uncompressed";
  var ATTR_HTTP_SCHEME = "http.scheme";
  var ATTR_HTTP_STATUS_CODE = "http.status_code";
  var ATTR_HTTP_URL2 = "http.url";
  var ATTR_HTTP_USER_AGENT2 = "http.user_agent";

  // node_modules/@opentelemetry/instrumentation-fetch/build/esm/utils.js
  var DIAG_LOGGER = diag2.createComponentLogger({
    namespace: "@opentelemetry/opentelemetry-instrumentation-fetch/utils"
  });
  function getFetchBodyLength(...args) {
    if (args[0] instanceof URL || typeof args[0] === "string") {
      const requestInit = args[1];
      if (!requestInit?.body) {
        return Promise.resolve();
      }
      if (requestInit.body instanceof ReadableStream) {
        const { body, length } = _getBodyNonDestructively(requestInit.body);
        requestInit.body = body;
        return length;
      } else {
        return Promise.resolve(getXHRBodyLength(requestInit.body));
      }
    } else {
      const info = args[0];
      if (!info?.body) {
        return Promise.resolve();
      }
      return info.clone().text().then((t) => getByteLength(t));
    }
  }
  function _getBodyNonDestructively(body) {
    if (!body.pipeThrough) {
      DIAG_LOGGER.warn("Platform has ReadableStream but not pipeThrough!");
      return {
        body,
        length: Promise.resolve(void 0)
      };
    }
    let length = 0;
    let resolveLength;
    const lengthPromise = new Promise((resolve) => {
      resolveLength = resolve;
    });
    const transform = new TransformStream({
      start() {
      },
      async transform(chunk, controller) {
        const bytearray = await chunk;
        length += bytearray.byteLength;
        controller.enqueue(chunk);
      },
      flush() {
        resolveLength(length);
      }
    });
    return {
      body: body.pipeThrough(transform),
      length: lengthPromise
    };
  }
  function isDocument(value) {
    return typeof Document !== "undefined" && value instanceof Document;
  }
  function getXHRBodyLength(body) {
    if (isDocument(body)) {
      return new XMLSerializer().serializeToString(document).length;
    }
    if (typeof body === "string") {
      return getByteLength(body);
    }
    if (body instanceof Blob) {
      return body.size;
    }
    if (body instanceof FormData) {
      return getFormDataSize(body);
    }
    if (body instanceof URLSearchParams) {
      return getByteLength(body.toString());
    }
    if (body.byteLength !== void 0) {
      return body.byteLength;
    }
    DIAG_LOGGER.warn("unknown body type");
    return void 0;
  }
  var TEXT_ENCODER = new TextEncoder();
  function getByteLength(s) {
    return TEXT_ENCODER.encode(s).byteLength;
  }
  function getFormDataSize(formData) {
    let size = 0;
    for (const [key, value] of formData.entries()) {
      size += key.length;
      if (value instanceof Blob) {
        size += value.size;
      } else {
        size += value.length;
      }
    }
    return size;
  }
  function normalizeHttpRequestMethod(method) {
    const knownMethods3 = getKnownMethods();
    const methUpper = method.toUpperCase();
    if (methUpper in knownMethods3) {
      return methUpper;
    } else {
      return "_OTHER";
    }
  }
  var DEFAULT_KNOWN_METHODS = {
    CONNECT: true,
    DELETE: true,
    GET: true,
    HEAD: true,
    OPTIONS: true,
    PATCH: true,
    POST: true,
    PUT: true,
    TRACE: true
  };
  var knownMethods;
  function getKnownMethods() {
    if (knownMethods === void 0) {
      const cfgMethods = getStringListFromEnv("OTEL_INSTRUMENTATION_HTTP_KNOWN_METHODS");
      if (cfgMethods && cfgMethods.length > 0) {
        knownMethods = {};
        cfgMethods.forEach((m) => {
          knownMethods[m] = true;
        });
      } else {
        knownMethods = DEFAULT_KNOWN_METHODS;
      }
    }
    return knownMethods;
  }
  var HTTP_PORT_FROM_PROTOCOL = {
    "https:": "443",
    "http:": "80"
  };
  function serverPortFromUrl(url) {
    const serverPort = Number(url.port || HTTP_PORT_FROM_PROTOCOL[url.protocol]);
    if (serverPort && !isNaN(serverPort)) {
      return serverPort;
    } else {
      return void 0;
    }
  }

  // node_modules/@opentelemetry/instrumentation-fetch/build/esm/version.js
  var VERSION4 = "0.208.0";

  // node_modules/@opentelemetry/instrumentation-fetch/build/esm/fetch.js
  var OBSERVER_WAIT_TIME_MS = 300;
  var isNode = typeof process === "object" && process.release?.name === "node";
  var FetchInstrumentation = class extends InstrumentationBase {
    component = "fetch";
    version = VERSION4;
    moduleName = this.component;
    _usedResources = /* @__PURE__ */ new WeakSet();
    _tasksCount = 0;
    _semconvStability;
    constructor(config = {}) {
      super("@opentelemetry/instrumentation-fetch", VERSION4, config);
      this._semconvStability = semconvStabilityFromStr("http", config?.semconvStabilityOptIn);
    }
    init() {
    }
    /**
     * Add cors pre flight child span
     * @param span
     * @param corsPreFlightRequest
     */
    _addChildSpan(span, corsPreFlightRequest) {
      const childSpan = this.tracer.startSpan("CORS Preflight", {
        startTime: corsPreFlightRequest[PerformanceTimingNames.FETCH_START]
      }, trace.setSpan(context.active(), span));
      const skipOldSemconvContentLengthAttrs = !(this._semconvStability & SemconvStability.OLD);
      addSpanNetworkEvents(childSpan, corsPreFlightRequest, this.getConfig().ignoreNetworkEvents, void 0, skipOldSemconvContentLengthAttrs);
      childSpan.end(corsPreFlightRequest[PerformanceTimingNames.RESPONSE_END]);
    }
    /**
     * Adds more attributes to span just before ending it
     * @param span
     * @param response
     */
    _addFinalSpanAttributes(span, response) {
      const parsedUrl = parseUrl(response.url);
      if (this._semconvStability & SemconvStability.OLD) {
        span.setAttribute(ATTR_HTTP_STATUS_CODE, response.status);
        if (response.statusText != null) {
          span.setAttribute(AttributeNames2.HTTP_STATUS_TEXT, response.statusText);
        }
        span.setAttribute(ATTR_HTTP_HOST, parsedUrl.host);
        span.setAttribute(ATTR_HTTP_SCHEME, parsedUrl.protocol.replace(":", ""));
        if (typeof navigator !== "undefined") {
          span.setAttribute(ATTR_HTTP_USER_AGENT2, navigator.userAgent);
        }
      }
      if (this._semconvStability & SemconvStability.STABLE) {
        span.setAttribute(ATTR_HTTP_RESPONSE_STATUS_CODE, response.status);
        span.setAttribute(ATTR_SERVER_ADDRESS, parsedUrl.hostname);
        const serverPort = serverPortFromUrl(parsedUrl);
        if (serverPort) {
          span.setAttribute(ATTR_SERVER_PORT, serverPort);
        }
      }
    }
    /**
     * Add headers
     * @param options
     * @param spanUrl
     */
    _addHeaders(options, spanUrl) {
      if (!shouldPropagateTraceHeaders(spanUrl, this.getConfig().propagateTraceHeaderCorsUrls)) {
        const headers = {};
        propagation.inject(context.active(), headers);
        if (Object.keys(headers).length > 0) {
          this._diag.debug("headers inject skipped due to CORS policy");
        }
        return;
      }
      if (options instanceof Request) {
        propagation.inject(context.active(), options.headers, {
          set: (h, k, v) => h.set(k, typeof v === "string" ? v : String(v))
        });
      } else if (options.headers instanceof Headers) {
        propagation.inject(context.active(), options.headers, {
          set: (h, k, v) => h.set(k, typeof v === "string" ? v : String(v))
        });
      } else if (options.headers instanceof Map) {
        propagation.inject(context.active(), options.headers, {
          set: (h, k, v) => h.set(k, typeof v === "string" ? v : String(v))
        });
      } else {
        const headers = {};
        propagation.inject(context.active(), headers);
        options.headers = Object.assign({}, headers, options.headers || {});
      }
    }
    /**
     * Clears the resource timings and all resources assigned with spans
     *     when {@link FetchPluginConfig.clearTimingResources} is
     *     set to true (default false)
     * @private
     */
    _clearResources() {
      if (this._tasksCount === 0 && this.getConfig().clearTimingResources) {
        performance.clearResourceTimings();
        this._usedResources = /* @__PURE__ */ new WeakSet();
      }
    }
    /**
     * Creates a new span
     * @param url
     * @param options
     */
    _createSpan(url, options = {}) {
      if (isUrlIgnored(url, this.getConfig().ignoreUrls)) {
        this._diag.debug("ignoring span as url matches ignored url");
        return;
      }
      let name = "";
      const attributes = {};
      if (this._semconvStability & SemconvStability.OLD) {
        const method = (options.method || "GET").toUpperCase();
        name = `HTTP ${method}`;
        attributes[AttributeNames2.COMPONENT] = this.moduleName;
        attributes[ATTR_HTTP_METHOD] = method;
        attributes[ATTR_HTTP_URL2] = url;
      }
      if (this._semconvStability & SemconvStability.STABLE) {
        const origMethod = options.method;
        const normMethod = normalizeHttpRequestMethod(options.method || "GET");
        if (!name) {
          name = normMethod;
        }
        attributes[ATTR_HTTP_REQUEST_METHOD] = normMethod;
        if (normMethod !== origMethod) {
          attributes[ATTR_HTTP_REQUEST_METHOD_ORIGINAL] = origMethod;
        }
        attributes[ATTR_URL_FULL] = url;
      }
      return this.tracer.startSpan(name, {
        kind: SpanKind.CLIENT,
        attributes
      });
    }
    /**
     * Finds appropriate resource and add network events to the span
     * @param span
     * @param resourcesObserver
     * @param endTime
     */
    _findResourceAndAddNetworkEvents(span, resourcesObserver, endTime) {
      let resources = resourcesObserver.entries;
      if (!resources.length) {
        if (!performance.getEntriesByType) {
          return;
        }
        resources = performance.getEntriesByType("resource");
      }
      const resource = getResource(resourcesObserver.spanUrl, resourcesObserver.startTime, endTime, resources, this._usedResources, "fetch");
      if (resource.mainRequest) {
        const mainRequest = resource.mainRequest;
        this._markResourceAsUsed(mainRequest);
        const corsPreFlightRequest = resource.corsPreFlightRequest;
        if (corsPreFlightRequest) {
          this._addChildSpan(span, corsPreFlightRequest);
          this._markResourceAsUsed(corsPreFlightRequest);
        }
        const skipOldSemconvContentLengthAttrs = !(this._semconvStability & SemconvStability.OLD);
        addSpanNetworkEvents(span, mainRequest, this.getConfig().ignoreNetworkEvents, void 0, skipOldSemconvContentLengthAttrs);
      }
    }
    /**
     * Marks certain [resource]{@link PerformanceResourceTiming} when information
     * from this is used to add events to span.
     * This is done to avoid reusing the same resource again for next span
     * @param resource
     */
    _markResourceAsUsed(resource) {
      this._usedResources.add(resource);
    }
    /**
     * Finish span, add attributes, network events etc.
     * @param span
     * @param spanData
     * @param response
     */
    _endSpan(span, spanData, response) {
      const endTime = millisToHrTime(Date.now());
      const performanceEndTime = hrTime();
      this._addFinalSpanAttributes(span, response);
      if (this._semconvStability & SemconvStability.STABLE) {
        if (response.status >= 400) {
          span.setStatus({ code: SpanStatusCode.ERROR });
          span.setAttribute(ATTR_ERROR_TYPE, String(response.status));
        }
      }
      setTimeout(() => {
        spanData.observer?.disconnect();
        this._findResourceAndAddNetworkEvents(span, spanData, performanceEndTime);
        this._tasksCount--;
        this._clearResources();
        span.end(endTime);
      }, OBSERVER_WAIT_TIME_MS);
    }
    /**
     * Patches the constructor of fetch
     */
    _patchConstructor() {
      return (original) => {
        const plugin = this;
        return function patchConstructor(...args) {
          const self2 = this;
          const url = parseUrl(args[0] instanceof Request ? args[0].url : String(args[0])).href;
          const options = args[0] instanceof Request ? args[0] : args[1] || {};
          const createdSpan = plugin._createSpan(url, options);
          if (!createdSpan) {
            return original.apply(this, args);
          }
          const spanData = plugin._prepareSpanData(url);
          if (plugin.getConfig().measureRequestSize) {
            getFetchBodyLength(...args).then((bodyLength) => {
              if (!bodyLength)
                return;
              if (plugin._semconvStability & SemconvStability.OLD) {
                createdSpan.setAttribute(ATTR_HTTP_REQUEST_CONTENT_LENGTH_UNCOMPRESSED, bodyLength);
              }
              if (plugin._semconvStability & SemconvStability.STABLE) {
                createdSpan.setAttribute(ATTR_HTTP_REQUEST_BODY_SIZE, bodyLength);
              }
            }).catch((error) => {
              plugin._diag.warn("getFetchBodyLength", error);
            });
          }
          function endSpanOnError(span, error) {
            plugin._applyAttributesAfterFetch(span, options, error);
            plugin._endSpan(span, spanData, {
              status: error.status || 0,
              statusText: error.message,
              url
            });
          }
          function endSpanOnSuccess(span, response) {
            plugin._applyAttributesAfterFetch(span, options, response);
            if (response.status >= 200 && response.status < 400) {
              plugin._endSpan(span, spanData, response);
            } else {
              plugin._endSpan(span, spanData, {
                status: response.status,
                statusText: response.statusText,
                url
              });
            }
          }
          function withCancelPropagation(body, readerClone) {
            if (!body)
              return null;
            const reader = body.getReader();
            return new ReadableStream({
              async pull(controller) {
                try {
                  const { value, done } = await reader.read();
                  if (done) {
                    reader.releaseLock();
                    controller.close();
                  } else {
                    controller.enqueue(value);
                  }
                } catch (err) {
                  controller.error(err);
                  reader.cancel(err).catch((_) => {
                  });
                  try {
                    reader.releaseLock();
                  } catch {
                  }
                }
              },
              cancel(reason) {
                readerClone.cancel(reason).catch((_) => {
                });
                return reader.cancel(reason);
              }
            });
          }
          function onSuccess(span, resolve, response) {
            let proxiedResponse = null;
            try {
              const resClone = response.clone();
              const body = resClone.body;
              if (body) {
                const reader = body.getReader();
                const isNullBodyStatus = (
                  // 101 responses and protocol upgrading is handled internally by the browser
                  response.status === 204 || response.status === 205 || response.status === 304
                );
                const wrappedBody = isNullBodyStatus ? null : withCancelPropagation(response.body, reader);
                proxiedResponse = new Response(wrappedBody, {
                  status: response.status,
                  statusText: response.statusText,
                  headers: response.headers
                });
                const read = () => {
                  reader.read().then(({ done }) => {
                    if (done) {
                      endSpanOnSuccess(span, response);
                    } else {
                      read();
                    }
                  }, (error) => {
                    endSpanOnError(span, error);
                  });
                };
                read();
              } else {
                endSpanOnSuccess(span, response);
              }
            } finally {
              resolve(proxiedResponse ?? response);
            }
          }
          function onError(span, reject, error) {
            try {
              endSpanOnError(span, error);
            } finally {
              reject(error);
            }
          }
          return new Promise((resolve, reject) => {
            return context.with(trace.setSpan(context.active(), createdSpan), () => {
              plugin._addHeaders(options, url);
              plugin._callRequestHook(createdSpan, options);
              plugin._tasksCount++;
              return original.apply(self2, options instanceof Request ? [options] : [url, options]).then(onSuccess.bind(self2, createdSpan, resolve), onError.bind(self2, createdSpan, reject));
            });
          });
        };
      };
    }
    _applyAttributesAfterFetch(span, request, result) {
      const applyCustomAttributesOnSpan = this.getConfig().applyCustomAttributesOnSpan;
      if (applyCustomAttributesOnSpan) {
        safeExecuteInTheMiddle(() => applyCustomAttributesOnSpan(span, request, result), (error) => {
          if (!error) {
            return;
          }
          this._diag.error("applyCustomAttributesOnSpan", error);
        }, true);
      }
    }
    _callRequestHook(span, request) {
      const requestHook = this.getConfig().requestHook;
      if (requestHook) {
        safeExecuteInTheMiddle(() => requestHook(span, request), (error) => {
          if (!error) {
            return;
          }
          this._diag.error("requestHook", error);
        }, true);
      }
    }
    /**
     * Prepares a span data - needed later for matching appropriate network
     *     resources
     * @param spanUrl
     */
    _prepareSpanData(spanUrl) {
      const startTime = hrTime();
      const entries = [];
      if (typeof PerformanceObserver !== "function") {
        return { entries, startTime, spanUrl };
      }
      const observer = new PerformanceObserver((list) => {
        const perfObsEntries = list.getEntries();
        perfObsEntries.forEach((entry) => {
          if (entry.initiatorType === "fetch" && entry.name === spanUrl) {
            entries.push(entry);
          }
        });
      });
      observer.observe({
        entryTypes: ["resource"]
      });
      return { entries, observer, startTime, spanUrl };
    }
    /**
     * implements enable function
     */
    enable() {
      if (isNode) {
        this._diag.warn("this instrumentation is intended for web usage only, it does not instrument Node.js's fetch()");
        return;
      }
      if (isWrapped(fetch)) {
        this._unwrap(_globalThis3, "fetch");
        this._diag.debug("removing previous patch for constructor");
      }
      this._wrap(_globalThis3, "fetch", this._patchConstructor());
    }
    /**
     * implements unpatch function
     */
    disable() {
      if (isNode) {
        return;
      }
      this._unwrap(_globalThis3, "fetch");
      this._usedResources = /* @__PURE__ */ new WeakSet();
    }
  };

  // node_modules/@opentelemetry/instrumentation-long-task/build/esm/version.js
  var PACKAGE_VERSION2 = "0.53.0";
  var PACKAGE_NAME2 = "@opentelemetry/instrumentation-long-task";

  // node_modules/@opentelemetry/instrumentation-long-task/build/esm/instrumentation.js
  var LONGTASK_PERFORMANCE_TYPE = "longtask";
  var LongTaskInstrumentation = class extends InstrumentationBase {
    version = PACKAGE_VERSION2;
    _observer;
    constructor(config = {}) {
      super(PACKAGE_NAME2, PACKAGE_VERSION2, config);
    }
    init() {
    }
    isSupported() {
      if (typeof PerformanceObserver === "undefined" || !PerformanceObserver.supportedEntryTypes) {
        return false;
      }
      return PerformanceObserver.supportedEntryTypes.includes(LONGTASK_PERFORMANCE_TYPE);
    }
    _createSpanFromEntry(entry) {
      const span = this.tracer.startSpan(LONGTASK_PERFORMANCE_TYPE, {
        startTime: hrTime(entry.startTime)
      });
      const { observerCallback } = this.getConfig();
      if (observerCallback) {
        try {
          observerCallback(span, { longtaskEntry: entry });
        } catch (err) {
          diag2.error("longtask instrumentation: observer callback failed", err);
        }
      }
      span.setAttribute("longtask.name", entry.name);
      span.setAttribute("longtask.entry_type", entry.entryType);
      span.setAttribute("longtask.duration", entry.duration);
      if (Array.isArray(entry.attribution)) {
        entry.attribution.forEach((attribution, index) => {
          const prefix = entry.attribution.length > 1 ? `longtask.attribution[${index}]` : "longtask.attribution";
          span.setAttribute(`${prefix}.name`, attribution.name);
          span.setAttribute(`${prefix}.entry_type`, attribution.entryType);
          span.setAttribute(`${prefix}.start_time`, attribution.startTime);
          span.setAttribute(`${prefix}.duration`, attribution.duration);
          span.setAttribute(`${prefix}.container_type`, attribution.containerType);
          span.setAttribute(`${prefix}.container_src`, attribution.containerSrc);
          span.setAttribute(`${prefix}.container_id`, attribution.containerId);
          span.setAttribute(`${prefix}.container_name`, attribution.containerName);
        });
      }
      span.end(hrTime(entry.startTime + entry.duration));
    }
    enable() {
      if (!this.isSupported()) {
        this._diag.debug("Environment not supported");
        return;
      }
      if (this._observer) {
        return;
      }
      this._observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => this._createSpanFromEntry(entry));
      });
      this._observer.observe({
        type: LONGTASK_PERFORMANCE_TYPE,
        buffered: true
      });
    }
    disable() {
      if (!this._observer) {
        return;
      }
      this._observer.disconnect();
      this._observer = void 0;
    }
  };

  // node_modules/@opentelemetry/instrumentation-user-interaction/build/esm/enums/AttributeNames.js
  var AttributeNames3;
  (function(AttributeNames5) {
    AttributeNames5["EVENT_TYPE"] = "event_type";
    AttributeNames5["TARGET_ELEMENT"] = "target_element";
    AttributeNames5["TARGET_XPATH"] = "target_xpath";
    AttributeNames5["HTTP_URL"] = "http.url";
  })(AttributeNames3 || (AttributeNames3 = {}));

  // node_modules/@opentelemetry/instrumentation-user-interaction/build/esm/version.js
  var PACKAGE_VERSION3 = "0.53.0";
  var PACKAGE_NAME3 = "@opentelemetry/instrumentation-user-interaction";

  // node_modules/@opentelemetry/instrumentation-user-interaction/build/esm/instrumentation.js
  var ZONE_CONTEXT_KEY = "OT_ZONE_CONTEXT";
  var EVENT_NAVIGATION_NAME = "Navigation:";
  var DEFAULT_EVENT_NAMES = ["click"];
  function defaultShouldPreventSpanCreation() {
    return false;
  }
  var UserInteractionInstrumentation = class extends InstrumentationBase {
    version = PACKAGE_VERSION3;
    moduleName = "user-interaction";
    _spansData = /* @__PURE__ */ new WeakMap();
    // for addEventListener/removeEventListener state
    _wrappedListeners = /* @__PURE__ */ new WeakMap();
    // for event bubbling
    _eventsSpanMap = /* @__PURE__ */ new WeakMap();
    _eventNames;
    _shouldPreventSpanCreation;
    constructor(config = {}) {
      super(PACKAGE_NAME3, PACKAGE_VERSION3, config);
      this._eventNames = new Set(config?.eventNames ?? DEFAULT_EVENT_NAMES);
      this._shouldPreventSpanCreation = typeof config?.shouldPreventSpanCreation === "function" ? config.shouldPreventSpanCreation : defaultShouldPreventSpanCreation;
    }
    init() {
    }
    /**
     * This will check if last task was timeout and will save the time to
     * fix the user interaction when nothing happens
     * This timeout comes from xhr plugin which is needed to collect information
     * about last xhr main request from observer
     * @param task
     * @param span
     */
    _checkForTimeout(task, span) {
      const spanData = this._spansData.get(span);
      if (spanData) {
        if (task.source === "setTimeout") {
          spanData.hrTimeLastTimeout = hrTime();
        } else if (task.source !== "Promise.then" && task.source !== "setTimeout") {
          spanData.hrTimeLastTimeout = void 0;
        }
      }
    }
    /**
     * Controls whether or not to create a span, based on the event type.
     */
    _allowEventName(eventName) {
      return this._eventNames.has(eventName);
    }
    /**
     * Creates a new span
     * @param element
     * @param eventName
     * @param parentSpan
     */
    _createSpan(element, eventName, parentSpan) {
      if (!(element instanceof HTMLElement)) {
        return void 0;
      }
      if (!element.getAttribute) {
        return void 0;
      }
      if (element.hasAttribute("disabled")) {
        return void 0;
      }
      if (!this._allowEventName(eventName)) {
        return void 0;
      }
      const xpath = getElementXPath(element, true);
      try {
        const span = this.tracer.startSpan(eventName, {
          attributes: {
            [AttributeNames3.EVENT_TYPE]: eventName,
            [AttributeNames3.TARGET_ELEMENT]: element.tagName,
            [AttributeNames3.TARGET_XPATH]: xpath,
            [AttributeNames3.HTTP_URL]: window.location.href
          }
        }, parentSpan ? trace.setSpan(context.active(), parentSpan) : void 0);
        if (this._shouldPreventSpanCreation(eventName, element, span) === true) {
          return void 0;
        }
        this._spansData.set(span, {
          taskCount: 0
        });
        return span;
      } catch (e) {
        this._diag.error("failed to start create new user interaction span", e);
      }
      return void 0;
    }
    /**
     * Decrement number of tasks that left in zone,
     * This is needed to be able to end span when no more tasks left
     * @param span
     */
    _decrementTask(span) {
      const spanData = this._spansData.get(span);
      if (spanData) {
        spanData.taskCount--;
        if (spanData.taskCount === 0) {
          this._tryToEndSpan(span, spanData.hrTimeLastTimeout);
        }
      }
    }
    /**
     * Return the current span
     * @param zone
     * @private
     */
    _getCurrentSpan(zone) {
      const context2 = zone.get(ZONE_CONTEXT_KEY);
      if (context2) {
        return trace.getSpan(context2);
      }
      return context2;
    }
    /**
     * Increment number of tasks that are run within the same zone.
     *     This is needed to be able to end span when no more tasks left
     * @param span
     */
    _incrementTask(span) {
      const spanData = this._spansData.get(span);
      if (spanData) {
        spanData.taskCount++;
      }
    }
    /**
     * Returns true iff we should use the patched callback; false if it's already been patched
     */
    addPatchedListener(on, type, listener, wrappedListener) {
      let listener2Type = this._wrappedListeners.get(listener);
      if (!listener2Type) {
        listener2Type = /* @__PURE__ */ new Map();
        this._wrappedListeners.set(listener, listener2Type);
      }
      let element2patched = listener2Type.get(type);
      if (!element2patched) {
        element2patched = /* @__PURE__ */ new Map();
        listener2Type.set(type, element2patched);
      }
      if (element2patched.has(on)) {
        return false;
      }
      element2patched.set(on, wrappedListener);
      return true;
    }
    /**
     * Returns the patched version of the callback (or undefined)
     */
    removePatchedListener(on, type, listener) {
      const listener2Type = this._wrappedListeners.get(listener);
      if (!listener2Type) {
        return void 0;
      }
      const element2patched = listener2Type.get(type);
      if (!element2patched) {
        return void 0;
      }
      const patched = element2patched.get(on);
      if (patched) {
        element2patched.delete(on);
        if (element2patched.size === 0) {
          listener2Type.delete(type);
          if (listener2Type.size === 0) {
            this._wrappedListeners.delete(listener);
          }
        }
      }
      return patched;
    }
    // utility method to deal with the Function|EventListener nature of addEventListener
    _invokeListener(listener, target, args) {
      if (typeof listener === "function") {
        return listener.apply(target, args);
      } else {
        return listener.handleEvent(args[0]);
      }
    }
    /**
     * This patches the addEventListener of HTMLElement to be able to
     * auto instrument the click events
     * This is done when zone is not available
     */
    _patchAddEventListener() {
      const plugin = this;
      return (original) => {
        return function addEventListenerPatched(type, listener, useCapture) {
          if (!listener) {
            return original.call(this, type, listener, useCapture);
          }
          const once = useCapture && typeof useCapture === "object" && useCapture.once;
          const patchedListener = function(...args) {
            let parentSpan;
            const event = args[0];
            const target = event?.target;
            if (event) {
              parentSpan = plugin._eventsSpanMap.get(event);
            }
            if (once) {
              plugin.removePatchedListener(this, type, listener);
            }
            const span = plugin._createSpan(target, type, parentSpan);
            if (span) {
              if (event) {
                plugin._eventsSpanMap.set(event, span);
              }
              return context.with(trace.setSpan(context.active(), span), () => {
                const result = plugin._invokeListener(listener, this, args);
                span.end();
                return result;
              });
            } else {
              return plugin._invokeListener(listener, this, args);
            }
          };
          if (plugin.addPatchedListener(this, type, listener, patchedListener)) {
            return original.call(this, type, patchedListener, useCapture);
          }
        };
      };
    }
    /**
     * This patches the removeEventListener of HTMLElement to handle the fact that
     * we patched the original callbacks
     * This is done when zone is not available
     */
    _patchRemoveEventListener() {
      const plugin = this;
      return (original) => {
        return function removeEventListenerPatched(type, listener, useCapture) {
          const wrappedListener = plugin.removePatchedListener(this, type, listener);
          if (wrappedListener) {
            return original.call(this, type, wrappedListener, useCapture);
          } else {
            return original.call(this, type, listener, useCapture);
          }
        };
      };
    }
    /**
     * Most browser provide event listener api via EventTarget in prototype chain.
     * Exception to this is IE 11 which has it on the prototypes closest to EventTarget:
     *
     * * - has addEventListener in IE
     * ** - has addEventListener in all other browsers
     * ! - missing in IE
     *
     * HTMLElement -> Element -> Node * -> EventTarget **! -> Object
     * Document -> Node * -> EventTarget **! -> Object
     * Window * -> WindowProperties ! -> EventTarget **! -> Object
     */
    _getPatchableEventTargets() {
      return window.EventTarget ? [EventTarget.prototype] : [Node.prototype, Window.prototype];
    }
    /**
     * Patches the history api
     */
    _patchHistoryApi() {
      this._unpatchHistoryApi();
      this._wrap(history, "replaceState", this._patchHistoryMethod());
      this._wrap(history, "pushState", this._patchHistoryMethod());
      this._wrap(history, "back", this._patchHistoryMethod());
      this._wrap(history, "forward", this._patchHistoryMethod());
      this._wrap(history, "go", this._patchHistoryMethod());
    }
    /**
     * Patches the certain history api method
     */
    _patchHistoryMethod() {
      const plugin = this;
      return (original) => {
        return function patchHistoryMethod(...args) {
          const url = `${location.pathname}${location.hash}${location.search}`;
          const result = original.apply(this, args);
          const urlAfter = `${location.pathname}${location.hash}${location.search}`;
          if (url !== urlAfter) {
            plugin._updateInteractionName(urlAfter);
          }
          return result;
        };
      };
    }
    /**
     * unpatch the history api methods
     */
    _unpatchHistoryApi() {
      if (isWrapped(history.replaceState))
        this._unwrap(history, "replaceState");
      if (isWrapped(history.pushState))
        this._unwrap(history, "pushState");
      if (isWrapped(history.back))
        this._unwrap(history, "back");
      if (isWrapped(history.forward))
        this._unwrap(history, "forward");
      if (isWrapped(history.go))
        this._unwrap(history, "go");
    }
    /**
     * Updates interaction span name
     * @param url
     */
    _updateInteractionName(url) {
      const span = trace.getSpan(context.active());
      if (span && typeof span.updateName === "function") {
        span.updateName(`${EVENT_NAVIGATION_NAME} ${url}`);
      }
    }
    /**
     * Patches zone cancel task - this is done to be able to correctly
     * decrement the number of remaining tasks
     */
    _patchZoneCancelTask() {
      const plugin = this;
      return (original) => {
        return function patchCancelTask(task) {
          const currentZone = Zone.current;
          const currentSpan = plugin._getCurrentSpan(currentZone);
          if (currentSpan && plugin._shouldCountTask(task, currentZone)) {
            plugin._decrementTask(currentSpan);
          }
          return original.call(this, task);
        };
      };
    }
    /**
     * Patches zone schedule task - this is done to be able to correctly
     * increment the number of tasks running within current zone but also to
     * save time in case of timeout running from xhr plugin when waiting for
     * main request from PerformanceResourceTiming
     */
    _patchZoneScheduleTask() {
      const plugin = this;
      return (original) => {
        return function patchScheduleTask(task) {
          const currentZone = Zone.current;
          const currentSpan = plugin._getCurrentSpan(currentZone);
          if (currentSpan && plugin._shouldCountTask(task, currentZone)) {
            plugin._incrementTask(currentSpan);
            plugin._checkForTimeout(task, currentSpan);
          }
          return original.call(this, task);
        };
      };
    }
    /**
     * Patches zone run task - this is done to be able to create a span when
     * user interaction starts
     * @private
     */
    _patchZoneRunTask() {
      const plugin = this;
      return (original) => {
        return function patchRunTask(task, applyThis, applyArgs) {
          const event = Array.isArray(applyArgs) && applyArgs[0] instanceof Event ? applyArgs[0] : void 0;
          const target = event?.target;
          let span;
          const activeZone = this;
          if (target) {
            span = plugin._createSpan(target, task.eventName);
            if (span) {
              plugin._incrementTask(span);
              return activeZone.run(() => {
                try {
                  return context.with(trace.setSpan(context.active(), span), () => {
                    const currentZone = Zone.current;
                    task._zone = currentZone;
                    return original.call(currentZone, task, applyThis, applyArgs);
                  });
                } finally {
                  plugin._decrementTask(span);
                }
              });
            }
          } else {
            span = plugin._getCurrentSpan(activeZone);
          }
          try {
            return original.call(activeZone, task, applyThis, applyArgs);
          } finally {
            if (span && plugin._shouldCountTask(task, activeZone)) {
              plugin._decrementTask(span);
            }
          }
        };
      };
    }
    /**
     * Decides if task should be counted.
     * @param task
     * @param currentZone
     * @private
     */
    _shouldCountTask(task, currentZone) {
      if (task._zone) {
        currentZone = task._zone;
      }
      if (!currentZone || !task.data || task.data.isPeriodic) {
        return false;
      }
      const currentSpan = this._getCurrentSpan(currentZone);
      if (!currentSpan) {
        return false;
      }
      if (!this._spansData.get(currentSpan)) {
        return false;
      }
      return task.type === "macroTask" || task.type === "microTask";
    }
    /**
     * Will try to end span when such span still exists.
     * @param span
     * @param endTime
     * @private
     */
    _tryToEndSpan(span, endTime) {
      if (span) {
        const spanData = this._spansData.get(span);
        if (spanData) {
          span.end(endTime);
          this._spansData.delete(span);
        }
      }
    }
    /**
     * implements enable function
     */
    enable() {
      const ZoneWithPrototype = this._getZoneWithPrototype();
      this._diag.debug("applying patch to", this.moduleName, this.version, "zone:", !!ZoneWithPrototype);
      if (ZoneWithPrototype) {
        if (isWrapped(ZoneWithPrototype.prototype.runTask)) {
          this._unwrap(ZoneWithPrototype.prototype, "runTask");
          this._diag.debug("removing previous patch from method runTask");
        }
        if (isWrapped(ZoneWithPrototype.prototype.scheduleTask)) {
          this._unwrap(ZoneWithPrototype.prototype, "scheduleTask");
          this._diag.debug("removing previous patch from method scheduleTask");
        }
        if (isWrapped(ZoneWithPrototype.prototype.cancelTask)) {
          this._unwrap(ZoneWithPrototype.prototype, "cancelTask");
          this._diag.debug("removing previous patch from method cancelTask");
        }
        this._zonePatched = true;
        this._wrap(ZoneWithPrototype.prototype, "runTask", this._patchZoneRunTask());
        this._wrap(ZoneWithPrototype.prototype, "scheduleTask", this._patchZoneScheduleTask());
        this._wrap(ZoneWithPrototype.prototype, "cancelTask", this._patchZoneCancelTask());
      } else {
        this._zonePatched = false;
        const targets = this._getPatchableEventTargets();
        targets.forEach((target) => {
          if (isWrapped(target.addEventListener)) {
            this._unwrap(target, "addEventListener");
            this._diag.debug("removing previous patch from method addEventListener");
          }
          if (isWrapped(target.removeEventListener)) {
            this._unwrap(target, "removeEventListener");
            this._diag.debug("removing previous patch from method removeEventListener");
          }
          this._wrap(target, "addEventListener", this._patchAddEventListener());
          this._wrap(target, "removeEventListener", this._patchRemoveEventListener());
        });
      }
      this._patchHistoryApi();
    }
    /**
     * implements unpatch function
     */
    disable() {
      const ZoneWithPrototype = this._getZoneWithPrototype();
      this._diag.debug("removing patch from", this.moduleName, this.version, "zone:", !!ZoneWithPrototype);
      if (ZoneWithPrototype && this._zonePatched) {
        if (isWrapped(ZoneWithPrototype.prototype.runTask)) {
          this._unwrap(ZoneWithPrototype.prototype, "runTask");
        }
        if (isWrapped(ZoneWithPrototype.prototype.scheduleTask)) {
          this._unwrap(ZoneWithPrototype.prototype, "scheduleTask");
        }
        if (isWrapped(ZoneWithPrototype.prototype.cancelTask)) {
          this._unwrap(ZoneWithPrototype.prototype, "cancelTask");
        }
      } else {
        const targets = this._getPatchableEventTargets();
        targets.forEach((target) => {
          if (isWrapped(target.addEventListener)) {
            this._unwrap(target, "addEventListener");
          }
          if (isWrapped(target.removeEventListener)) {
            this._unwrap(target, "removeEventListener");
          }
        });
      }
      this._unpatchHistoryApi();
    }
    /**
     * returns Zone
     */
    _getZoneWithPrototype() {
      const _window = window;
      return _window.Zone;
    }
  };

  // node_modules/@opentelemetry/instrumentation-xml-http-request/build/esm/semconv.js
  var ATTR_HTTP_HOST2 = "http.host";
  var ATTR_HTTP_METHOD2 = "http.method";
  var ATTR_HTTP_REQUEST_BODY_SIZE2 = "http.request.body.size";
  var ATTR_HTTP_REQUEST_CONTENT_LENGTH_UNCOMPRESSED2 = "http.request_content_length_uncompressed";
  var ATTR_HTTP_SCHEME2 = "http.scheme";
  var ATTR_HTTP_STATUS_CODE2 = "http.status_code";
  var ATTR_HTTP_URL3 = "http.url";
  var ATTR_HTTP_USER_AGENT3 = "http.user_agent";

  // node_modules/@opentelemetry/instrumentation-xml-http-request/build/esm/enums/EventNames.js
  var EventNames2;
  (function(EventNames3) {
    EventNames3["METHOD_OPEN"] = "open";
    EventNames3["METHOD_SEND"] = "send";
    EventNames3["EVENT_ABORT"] = "abort";
    EventNames3["EVENT_ERROR"] = "error";
    EventNames3["EVENT_LOAD"] = "loaded";
    EventNames3["EVENT_TIMEOUT"] = "timeout";
  })(EventNames2 || (EventNames2 = {}));

  // node_modules/@opentelemetry/instrumentation-xml-http-request/build/esm/utils.js
  var DIAG_LOGGER2 = diag2.createComponentLogger({
    namespace: "@opentelemetry/opentelemetry-instrumentation-xml-http-request/utils"
  });
  function isDocument2(value) {
    return typeof Document !== "undefined" && value instanceof Document;
  }
  function getXHRBodyLength2(body) {
    if (isDocument2(body)) {
      return new XMLSerializer().serializeToString(document).length;
    }
    if (typeof body === "string") {
      return getByteLength2(body);
    }
    if (body instanceof Blob) {
      return body.size;
    }
    if (body instanceof FormData) {
      return getFormDataSize2(body);
    }
    if (body instanceof URLSearchParams) {
      return getByteLength2(body.toString());
    }
    if (body.byteLength !== void 0) {
      return body.byteLength;
    }
    DIAG_LOGGER2.warn("unknown body type");
    return void 0;
  }
  var TEXT_ENCODER2 = new TextEncoder();
  function getByteLength2(s) {
    return TEXT_ENCODER2.encode(s).byteLength;
  }
  function getFormDataSize2(formData) {
    let size = 0;
    for (const [key, value] of formData.entries()) {
      size += key.length;
      if (value instanceof Blob) {
        size += value.size;
      } else {
        size += value.length;
      }
    }
    return size;
  }
  function normalizeHttpRequestMethod2(method) {
    const knownMethods3 = getKnownMethods2();
    const methUpper = method.toUpperCase();
    if (methUpper in knownMethods3) {
      return methUpper;
    } else {
      return "_OTHER";
    }
  }
  var DEFAULT_KNOWN_METHODS2 = {
    CONNECT: true,
    DELETE: true,
    GET: true,
    HEAD: true,
    OPTIONS: true,
    PATCH: true,
    POST: true,
    PUT: true,
    TRACE: true
  };
  var knownMethods2;
  function getKnownMethods2() {
    if (knownMethods2 === void 0) {
      const cfgMethods = getStringListFromEnv("OTEL_INSTRUMENTATION_HTTP_KNOWN_METHODS");
      if (cfgMethods && cfgMethods.length > 0) {
        knownMethods2 = {};
        cfgMethods.forEach((m) => {
          knownMethods2[m] = true;
        });
      } else {
        knownMethods2 = DEFAULT_KNOWN_METHODS2;
      }
    }
    return knownMethods2;
  }
  var HTTP_PORT_FROM_PROTOCOL2 = {
    "https:": "443",
    "http:": "80"
  };
  function serverPortFromUrl2(url) {
    const serverPort = Number(url.port || HTTP_PORT_FROM_PROTOCOL2[url.protocol]);
    if (serverPort && !isNaN(serverPort)) {
      return serverPort;
    } else {
      return void 0;
    }
  }

  // node_modules/@opentelemetry/instrumentation-xml-http-request/build/esm/version.js
  var VERSION5 = "0.208.0";

  // node_modules/@opentelemetry/instrumentation-xml-http-request/build/esm/enums/AttributeNames.js
  var AttributeNames4;
  (function(AttributeNames5) {
    AttributeNames5["HTTP_STATUS_TEXT"] = "http.status_text";
  })(AttributeNames4 || (AttributeNames4 = {}));

  // node_modules/@opentelemetry/instrumentation-xml-http-request/build/esm/xhr.js
  var OBSERVER_WAIT_TIME_MS2 = 300;
  var XMLHttpRequestInstrumentation = class extends InstrumentationBase {
    component = "xml-http-request";
    version = VERSION5;
    moduleName = this.component;
    _tasksCount = 0;
    _xhrMem = /* @__PURE__ */ new WeakMap();
    _usedResources = /* @__PURE__ */ new WeakSet();
    _semconvStability;
    constructor(config = {}) {
      super("@opentelemetry/instrumentation-xml-http-request", VERSION5, config);
      this._semconvStability = semconvStabilityFromStr("http", config?.semconvStabilityOptIn);
    }
    init() {
    }
    /**
     * Adds custom headers to XMLHttpRequest
     * @param xhr
     * @param spanUrl
     * @private
     */
    _addHeaders(xhr, spanUrl) {
      const url = parseUrl(spanUrl).href;
      if (!shouldPropagateTraceHeaders(url, this.getConfig().propagateTraceHeaderCorsUrls)) {
        const headers2 = {};
        propagation.inject(context.active(), headers2);
        if (Object.keys(headers2).length > 0) {
          this._diag.debug("headers inject skipped due to CORS policy");
        }
        return;
      }
      const headers = {};
      propagation.inject(context.active(), headers);
      Object.keys(headers).forEach((key) => {
        xhr.setRequestHeader(key, String(headers[key]));
      });
    }
    /**
     * Add cors pre flight child span
     * @param span
     * @param corsPreFlightRequest
     * @private
     */
    _addChildSpan(span, corsPreFlightRequest) {
      context.with(trace.setSpan(context.active(), span), () => {
        const childSpan = this.tracer.startSpan("CORS Preflight", {
          startTime: corsPreFlightRequest[PerformanceTimingNames.FETCH_START]
        });
        const skipOldSemconvContentLengthAttrs = !(this._semconvStability & SemconvStability.OLD);
        addSpanNetworkEvents(childSpan, corsPreFlightRequest, this.getConfig().ignoreNetworkEvents, void 0, skipOldSemconvContentLengthAttrs);
        childSpan.end(corsPreFlightRequest[PerformanceTimingNames.RESPONSE_END]);
      });
    }
    /**
     * Add attributes when span is going to end
     * @param span
     * @param xhr
     * @param spanUrl
     * @private
     */
    _addFinalSpanAttributes(span, xhrMem, spanUrl) {
      if (this._semconvStability & SemconvStability.OLD) {
        if (xhrMem.status !== void 0) {
          span.setAttribute(ATTR_HTTP_STATUS_CODE2, xhrMem.status);
        }
        if (xhrMem.statusText !== void 0) {
          span.setAttribute(AttributeNames4.HTTP_STATUS_TEXT, xhrMem.statusText);
        }
        if (typeof spanUrl === "string") {
          const parsedUrl = parseUrl(spanUrl);
          span.setAttribute(ATTR_HTTP_HOST2, parsedUrl.host);
          span.setAttribute(ATTR_HTTP_SCHEME2, parsedUrl.protocol.replace(":", ""));
        }
        span.setAttribute(ATTR_HTTP_USER_AGENT3, navigator.userAgent);
      }
      if (this._semconvStability & SemconvStability.STABLE) {
        if (xhrMem.status) {
          span.setAttribute(ATTR_HTTP_RESPONSE_STATUS_CODE, xhrMem.status);
        }
      }
    }
    _applyAttributesAfterXHR(span, xhr) {
      const applyCustomAttributesOnSpan = this.getConfig().applyCustomAttributesOnSpan;
      if (typeof applyCustomAttributesOnSpan === "function") {
        safeExecuteInTheMiddle(() => applyCustomAttributesOnSpan(span, xhr), (error) => {
          if (!error) {
            return;
          }
          this._diag.error("applyCustomAttributesOnSpan", error);
        }, true);
      }
    }
    /**
     * will collect information about all resources created
     * between "send" and "end" with additional waiting for main resource
     * @param xhr
     * @param spanUrl
     * @private
     */
    _addResourceObserver(xhr, spanUrl) {
      const xhrMem = this._xhrMem.get(xhr);
      if (!xhrMem || typeof PerformanceObserver !== "function" || typeof PerformanceResourceTiming !== "function") {
        return;
      }
      xhrMem.createdResources = {
        observer: new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const parsedUrl = parseUrl(spanUrl);
          entries.forEach((entry) => {
            if (entry.initiatorType === "xmlhttprequest" && entry.name === parsedUrl.href) {
              if (xhrMem.createdResources) {
                xhrMem.createdResources.entries.push(entry);
              }
            }
          });
        }),
        entries: []
      };
      xhrMem.createdResources.observer.observe({
        entryTypes: ["resource"]
      });
    }
    /**
     * Clears the resource timings and all resources assigned with spans
     *     when {@link XMLHttpRequestInstrumentationConfig.clearTimingResources} is
     *     set to true (default false)
     * @private
     */
    _clearResources() {
      if (this._tasksCount === 0 && this.getConfig().clearTimingResources) {
        otperformance.clearResourceTimings();
        this._xhrMem = /* @__PURE__ */ new WeakMap();
        this._usedResources = /* @__PURE__ */ new WeakSet();
      }
    }
    /**
     * Finds appropriate resource and add network events to the span
     * @param span
     */
    _findResourceAndAddNetworkEvents(xhrMem, span, spanUrl, startTime, endTime) {
      if (!spanUrl || !startTime || !endTime || !xhrMem.createdResources) {
        return;
      }
      let resources = xhrMem.createdResources.entries;
      if (!resources || !resources.length) {
        resources = otperformance.getEntriesByType("resource");
      }
      const resource = getResource(parseUrl(spanUrl).href, startTime, endTime, resources, this._usedResources);
      if (resource.mainRequest) {
        const mainRequest = resource.mainRequest;
        this._markResourceAsUsed(mainRequest);
        const corsPreFlightRequest = resource.corsPreFlightRequest;
        if (corsPreFlightRequest) {
          this._addChildSpan(span, corsPreFlightRequest);
          this._markResourceAsUsed(corsPreFlightRequest);
        }
        const skipOldSemconvContentLengthAttrs = !(this._semconvStability & SemconvStability.OLD);
        addSpanNetworkEvents(span, mainRequest, this.getConfig().ignoreNetworkEvents, void 0, skipOldSemconvContentLengthAttrs);
      }
    }
    /**
     * Removes the previous information about span.
     * This might happened when the same xhr is used again.
     * @param xhr
     * @private
     */
    _cleanPreviousSpanInformation(xhr) {
      const xhrMem = this._xhrMem.get(xhr);
      if (xhrMem) {
        const callbackToRemoveEvents = xhrMem.callbackToRemoveEvents;
        if (callbackToRemoveEvents) {
          callbackToRemoveEvents();
        }
        this._xhrMem.delete(xhr);
      }
    }
    /**
     * Creates a new span when method "open" is called
     * @param xhr
     * @param url
     * @param method
     * @private
     */
    _createSpan(xhr, url, method) {
      if (isUrlIgnored(url, this.getConfig().ignoreUrls)) {
        this._diag.debug("ignoring span as url matches ignored url");
        return;
      }
      let name = "";
      const parsedUrl = parseUrl(url);
      const attributes = {};
      if (this._semconvStability & SemconvStability.OLD) {
        name = method.toUpperCase();
        attributes[ATTR_HTTP_METHOD2] = method;
        attributes[ATTR_HTTP_URL3] = parsedUrl.toString();
      }
      if (this._semconvStability & SemconvStability.STABLE) {
        const origMethod = method;
        const normMethod = normalizeHttpRequestMethod2(method);
        if (!name) {
          name = normMethod;
        }
        attributes[ATTR_HTTP_REQUEST_METHOD] = normMethod;
        if (normMethod !== origMethod) {
          attributes[ATTR_HTTP_REQUEST_METHOD_ORIGINAL] = origMethod;
        }
        attributes[ATTR_URL_FULL] = parsedUrl.toString();
        attributes[ATTR_SERVER_ADDRESS] = parsedUrl.hostname;
        const serverPort = serverPortFromUrl2(parsedUrl);
        if (serverPort) {
          attributes[ATTR_SERVER_PORT] = serverPort;
        }
      }
      const currentSpan = this.tracer.startSpan(name, {
        kind: SpanKind.CLIENT,
        attributes
      });
      currentSpan.addEvent(EventNames2.METHOD_OPEN);
      this._cleanPreviousSpanInformation(xhr);
      this._xhrMem.set(xhr, {
        span: currentSpan,
        spanUrl: url
      });
      return currentSpan;
    }
    /**
     * Marks certain [resource]{@link PerformanceResourceTiming} when information
     * from this is used to add events to span.
     * This is done to avoid reusing the same resource again for next span
     * @param resource
     * @private
     */
    _markResourceAsUsed(resource) {
      this._usedResources.add(resource);
    }
    /**
     * Patches the method open
     * @private
     */
    _patchOpen() {
      return (original) => {
        const plugin = this;
        return function patchOpen(...args) {
          const method = args[0];
          const url = args[1];
          plugin._createSpan(this, url, method);
          return original.apply(this, args);
        };
      };
    }
    /**
     * Patches the method send
     * @private
     */
    _patchSend() {
      const plugin = this;
      function endSpanTimeout(eventName, xhrMem, performanceEndTime, endTime) {
        const callbackToRemoveEvents = xhrMem.callbackToRemoveEvents;
        if (typeof callbackToRemoveEvents === "function") {
          callbackToRemoveEvents();
        }
        const { span, spanUrl, sendStartTime } = xhrMem;
        if (span) {
          plugin._findResourceAndAddNetworkEvents(xhrMem, span, spanUrl, sendStartTime, performanceEndTime);
          span.addEvent(eventName, endTime);
          plugin._addFinalSpanAttributes(span, xhrMem, spanUrl);
          span.end(endTime);
          plugin._tasksCount--;
        }
        plugin._clearResources();
      }
      function endSpan(eventName, xhr, isError, errorType) {
        const xhrMem = plugin._xhrMem.get(xhr);
        if (!xhrMem) {
          return;
        }
        xhrMem.status = xhr.status;
        xhrMem.statusText = xhr.statusText;
        plugin._xhrMem.delete(xhr);
        if (xhrMem.span) {
          const span = xhrMem.span;
          plugin._applyAttributesAfterXHR(span, xhr);
          if (plugin._semconvStability & SemconvStability.STABLE) {
            if (isError) {
              if (errorType) {
                span.setStatus({
                  code: SpanStatusCode.ERROR,
                  message: errorType
                });
                span.setAttribute(ATTR_ERROR_TYPE, errorType);
              }
            } else if (xhrMem.status && xhrMem.status >= 400) {
              span.setStatus({ code: SpanStatusCode.ERROR });
              span.setAttribute(ATTR_ERROR_TYPE, String(xhrMem.status));
            }
          }
        }
        const performanceEndTime = hrTime();
        const endTime = Date.now();
        setTimeout(() => {
          endSpanTimeout(eventName, xhrMem, performanceEndTime, endTime);
        }, OBSERVER_WAIT_TIME_MS2);
      }
      function onError() {
        endSpan(EventNames2.EVENT_ERROR, this, true, "error");
      }
      function onAbort() {
        endSpan(EventNames2.EVENT_ABORT, this, false);
      }
      function onTimeout() {
        endSpan(EventNames2.EVENT_TIMEOUT, this, true, "timeout");
      }
      function onLoad() {
        if (this.status < 299) {
          endSpan(EventNames2.EVENT_LOAD, this, false);
        } else {
          endSpan(EventNames2.EVENT_ERROR, this, false);
        }
      }
      function unregister(xhr) {
        xhr.removeEventListener("abort", onAbort);
        xhr.removeEventListener("error", onError);
        xhr.removeEventListener("load", onLoad);
        xhr.removeEventListener("timeout", onTimeout);
        const xhrMem = plugin._xhrMem.get(xhr);
        if (xhrMem) {
          xhrMem.callbackToRemoveEvents = void 0;
        }
      }
      return (original) => {
        return function patchSend(...args) {
          const xhrMem = plugin._xhrMem.get(this);
          if (!xhrMem) {
            return original.apply(this, args);
          }
          const currentSpan = xhrMem.span;
          const spanUrl = xhrMem.spanUrl;
          if (currentSpan && spanUrl) {
            if (plugin.getConfig().measureRequestSize && args?.[0]) {
              const body = args[0];
              const bodyLength = getXHRBodyLength2(body);
              if (bodyLength !== void 0) {
                if (plugin._semconvStability & SemconvStability.OLD) {
                  currentSpan.setAttribute(ATTR_HTTP_REQUEST_CONTENT_LENGTH_UNCOMPRESSED2, bodyLength);
                }
                if (plugin._semconvStability & SemconvStability.STABLE) {
                  currentSpan.setAttribute(ATTR_HTTP_REQUEST_BODY_SIZE2, bodyLength);
                }
              }
            }
            context.with(trace.setSpan(context.active(), currentSpan), () => {
              plugin._tasksCount++;
              xhrMem.sendStartTime = hrTime();
              currentSpan.addEvent(EventNames2.METHOD_SEND);
              this.addEventListener("abort", onAbort);
              this.addEventListener("error", onError);
              this.addEventListener("load", onLoad);
              this.addEventListener("timeout", onTimeout);
              xhrMem.callbackToRemoveEvents = () => {
                unregister(this);
                if (xhrMem.createdResources) {
                  xhrMem.createdResources.observer.disconnect();
                }
              };
              plugin._addHeaders(this, spanUrl);
              plugin._addResourceObserver(this, spanUrl);
            });
          }
          return original.apply(this, args);
        };
      };
    }
    /**
     * implements enable function
     */
    enable() {
      this._diag.debug("applying patch to", this.moduleName, this.version);
      if (isWrapped(XMLHttpRequest.prototype.open)) {
        this._unwrap(XMLHttpRequest.prototype, "open");
        this._diag.debug("removing previous patch from method open");
      }
      if (isWrapped(XMLHttpRequest.prototype.send)) {
        this._unwrap(XMLHttpRequest.prototype, "send");
        this._diag.debug("removing previous patch from method send");
      }
      this._wrap(XMLHttpRequest.prototype, "open", this._patchOpen());
      this._wrap(XMLHttpRequest.prototype, "send", this._patchSend());
    }
    /**
     * implements disable function
     */
    disable() {
      this._diag.debug("removing patch from", this.moduleName, this.version);
      this._unwrap(XMLHttpRequest.prototype, "open");
      this._unwrap(XMLHttpRequest.prototype, "send");
      this._tasksCount = 0;
      this._xhrMem = /* @__PURE__ */ new WeakMap();
      this._usedResources = /* @__PURE__ */ new WeakSet();
    }
  };

  // node_modules/@opentelemetry/instrumentation-web-exception/node_modules/@opentelemetry/semantic-conventions/build/esm/stable_attributes.js
  var ATTR_EXCEPTION_MESSAGE2 = "exception.message";
  var ATTR_EXCEPTION_STACKTRACE2 = "exception.stacktrace";
  var ATTR_EXCEPTION_TYPE2 = "exception.type";

  // node_modules/@opentelemetry/instrumentation-web-exception/node_modules/@opentelemetry/core/build/esm/platform/browser/performance.js
  var otperformance2 = performance;

  // node_modules/@opentelemetry/instrumentation-web-exception/node_modules/@opentelemetry/core/build/esm/common/time.js
  var NANOSECOND_DIGITS2 = 9;
  var NANOSECOND_DIGITS_IN_MILLIS2 = 6;
  var MILLISECONDS_TO_NANOSECONDS2 = Math.pow(10, NANOSECOND_DIGITS_IN_MILLIS2);
  var SECOND_TO_NANOSECONDS2 = Math.pow(10, NANOSECOND_DIGITS2);
  function millisToHrTime2(epochMillis) {
    var epochSeconds = epochMillis / 1e3;
    var seconds = Math.trunc(epochSeconds);
    var nanos = Math.round(epochMillis % 1e3 * MILLISECONDS_TO_NANOSECONDS2);
    return [seconds, nanos];
  }
  function getTimeOrigin2() {
    var timeOrigin = otperformance2.timeOrigin;
    if (typeof timeOrigin !== "number") {
      var perf = otperformance2;
      timeOrigin = perf.timing && perf.timing.fetchStart;
    }
    return timeOrigin;
  }
  function hrTime2(performanceNow) {
    var timeOrigin = millisToHrTime2(getTimeOrigin2());
    var now = millisToHrTime2(typeof performanceNow === "number" ? performanceNow : otperformance2.now());
    return addHrTimes2(timeOrigin, now);
  }
  function addHrTimes2(time1, time2) {
    var out = [time1[0] + time2[0], time1[1] + time2[1]];
    if (out[1] >= SECOND_TO_NANOSECONDS2) {
      out[1] -= SECOND_TO_NANOSECONDS2;
      out[0] += 1;
    }
    return out;
  }

  // node_modules/@opentelemetry/instrumentation-web-exception/build/esm/version.js
  var PACKAGE_VERSION4 = "0.2.1";
  var PACKAGE_NAME4 = "@opentelemetry/instrumentation-web-exception";

  // node_modules/@opentelemetry/instrumentation-web-exception/build/esm/instrumentation.js
  var ExceptionInstrumentation = class extends InstrumentationBase {
    constructor(config = {}) {
      super(PACKAGE_NAME4, PACKAGE_VERSION4, config);
    }
    init() {
    }
    onError(event) {
      const EXCEPTION_EVENT_NAME = "exception";
      const error = "reason" in event ? event.reason : event.error;
      if (error === void 0) {
        return;
      }
      const logger2 = logs.getLoggerProvider().getLogger(this.instrumentationName, this.instrumentationVersion);
      const config = this.getConfig();
      const customAttributes = config.applyCustomAttributes ? config.applyCustomAttributes(error) : {};
      let errorAttributes = {};
      if (typeof error === "string") {
        errorAttributes = { [ATTR_EXCEPTION_MESSAGE2]: error };
      } else {
        errorAttributes = {
          [ATTR_EXCEPTION_TYPE2]: error.name,
          [ATTR_EXCEPTION_MESSAGE2]: error.message,
          [ATTR_EXCEPTION_STACKTRACE2]: error.stack
        };
      }
      const errorLog = {
        eventName: EXCEPTION_EVENT_NAME,
        severityNumber: SeverityNumber.ERROR,
        attributes: { ...errorAttributes, ...customAttributes },
        timestamp: hrTime2(),
        observedTimestamp: hrTime2()
      };
      logger2.emit(errorLog);
    }
    disable() {
      if (!this._enabled) {
        return;
      }
      this._enabled = false;
      window.removeEventListener("error", this.onError);
      window.removeEventListener("unhandledrejection", this.onError);
    }
    enable() {
      if (this._enabled) {
        return;
      }
      this._enabled = true;
      this.onError = this.onError.bind(this);
      window.addEventListener("error", this.onError);
      window.addEventListener("unhandledrejection", this.onError);
    }
  };

  // lib/logging.js
  var _logLevel = DiagLogLevel.INFO;
  var logLevelMap = {
    ALL: DiagLogLevel.ALL,
    VERBOSE: DiagLogLevel.VERBOSE,
    DEBUG: DiagLogLevel.DEBUG,
    INFO: DiagLogLevel.INFO,
    WARN: DiagLogLevel.WARN,
    ERROR: DiagLogLevel.ERROR,
    NONE: DiagLogLevel.NONE
  };
  function createLogger(config) {
    _logLevel = logLevelMap[config.logLevel.toUpperCase()];
    if (_logLevel == null) {
      console.warn(`Unknown log level "${config.logLevel}", expected one of ${Object.keys(logLevelMap)}, using default`);
      _logLevel = logLevelMap.INFO;
    }
    return {
      error: makeLogFunction(logLevelMap.ERROR, console.error.bind(console)),
      warn: makeLogFunction(logLevelMap.WARN, console.error.bind(console)),
      info: makeLogFunction(logLevelMap.INFO, console.log.bind(console)),
      debug: makeLogFunction(logLevelMap.DEBUG, console.log.bind(console)),
      verbose: makeLogFunction(logLevelMap.VERBOSE, console.trace.bind(console))
    };
  }
  function makeLogFunction(minLevel, emitFn) {
    return function LOG(...args) {
      const shouldLog = _logLevel >= minLevel;
      if (args.length === 0) {
        return shouldLog;
      }
      if (shouldLog) {
        emitFn(...args);
      }
    };
  }

  // lib/semconv.js
  var ATTR_BROWSER_BRANDS = "browser.brands";
  var ATTR_BROWSER_LANGUAGE = "browser.language";
  var ATTR_BROWSER_MOBILE = "browser.mobile";
  var ATTR_BROWSER_PLATFORM = "browser.platform";
  var ATTR_USER_AGENT_ORIGINAL2 = "user_agent.original";

  // lib/detector.js
  function detectResource(attribs, serviceName, serviceVersion) {
    if (typeof serviceName === "string" && serviceName) {
      attribs["service.name"] = serviceName;
    }
    if (typeof serviceVersion === "string" && serviceVersion) {
      attribs["service.version"] = serviceVersion;
    }
    const { userAgent, userAgentData } = navigator;
    const browserInfo = getBrowserInfo(userAgent);
    let platform;
    if (userAgentData) {
      platform = { name: userAgentData.platform, version: "" };
      attribs[ATTR_BROWSER_BRANDS] = userAgentData.brands.map((i) => `${i.brand} ${i.version}`);
    } else {
      platform = getPlatformInfo(userAgent);
    }
    if (browserInfo) {
      attribs["browser.name"] = browserInfo.name;
      attribs["browser.version"] = browserInfo.version;
    }
    if (platform) {
      attribs[ATTR_BROWSER_PLATFORM] = platform.name;
    }
    attribs[ATTR_BROWSER_MOBILE] = navigator.userAgent.includes("Mobi");
    attribs[ATTR_BROWSER_LANGUAGE] = navigator.language;
    attribs[ATTR_USER_AGENT_ORIGINAL2] = userAgent;
    attribs["telemetry.distro.name"] = "elastic";
    attribs["telemetry.distro.version"] = "0.1.0";
    return resourceFromAttributes({ ...attribs, ...SDK_INFO });
  }
  function getPlatformInfo(userAgent) {
    const platforms = [
      { name: "Windows Phone", test: /Windows Phone (\d+(\.\d+)*)/i },
      { name: "Windows", test: /Windows (\d+)/i },
      { name: "Windows RT", test: /Windows NT (\d+(\.\d+)*).+ARM;/i },
      { name: "Windows", test: /Windows NT (\d+\.\d+)/i },
      { name: "iOS", test: /iPhone OS (\d+(_\d+)*)/i },
      { name: "macOS", test: /Mac OS (\d+(_\d+)*)/i },
      { name: "macOS", test: /Mac OS X (\d+(\.\d+)*)/i },
      { name: "Android", test: /Android (\d+(\.\d+)*)/i },
      { name: "Linux", test: /Linux (\d+)/i }
    ];
    for (const p of platforms) {
      const match = p.test.exec(userAgent);
      if (match) {
        const name = p.name;
        const version = match[1].replaceAll("_", ".");
        return { name, version };
      }
    }
  }
  function getBrowserInfo(userAgent) {
    const browsers = [
      // Special names (keep them?)
      { name: "Coc Coc", test: /coc_coc_browser\/(\d+)/i },
      { name: "Baidu", test: /bdbrowser\/(\d+(\.\d+)*)/i },
      { name: "GSA", test: /GSA\/(\d+(\.\d+)*)/i },
      { name: "Silk", test: /Silk\/(\d+(\.\d+)*)/i },
      { name: "Yandex", test: /YaBrowser\/(\d+(\.\d+)*)/i },
      // The usual suspects
      { name: "Edge", test: /Edg\/(\d+)/i },
      { name: "Edge", test: /Edge\/(\d+)/i },
      { name: "Opera", test: /OPR\/(\d+(\.\d+)*)/i },
      { name: "Opera", test: /Opera\/(\d+(\.\d+)*)/i },
      { name: "Chromium", test: /Chromium\/(\d+)/i },
      { name: "Chrome", test: /Chrome\/(\d+)/i },
      { name: "Chrome", test: /CriOS\/(\d+)/i },
      { name: "Android Browser", test: /Android \d.+Safari\/(\d+)/i },
      { name: "Firefox", test: /Firefox\/(\d+)/i },
      { name: "Safari", test: /Safari\/(\d+)/i }
    ];
    for (const b of browsers) {
      const match = b.test.exec(userAgent);
      if (match) {
        const name = b.name;
        const version = match[1].replaceAll("_", ".");
        return { name, version };
      }
    }
  }

  // lib/sdk.js
  var sdkStarted = false;
  var defaultConfig = {
    logLevel: "info",
    sampleRate: 1,
    serviceName: "unknown_service:web",
    resourceAttributes: {},
    otlpEndpoint: "http://localhost:4318",
    exportHeaders: {}
  };
  function startBrowserSdk(cfg = {}) {
    if (sdkStarted) {
      return;
    }
    sdkStarted = true;
    const logLevel = cfg.logLevel ?? defaultConfig.logLevel;
    diag2.setLogger(
      createLogger({ logLevel }),
      { logLevel: DiagLogLevel.ALL }
    );
    diag2.debug(`Browser SDK intialization`, cfg);
    const { serviceName, serviceVersion } = cfg;
    const config = { ...defaultConfig, ...cfg };
    const resource = detectResource(config.resourceAttributes, serviceName, serviceVersion);
    const tracesEndpoint = `${config.otlpEndpoint}/v1/traces`;
    const tracerProvider = new WebTracerProvider({
      resource,
      sampler: new TraceIdRatioBasedSampler(config.sampleRate),
      spanProcessors: [
        new BatchSpanProcessor(
          new OTLPTraceExporter({
            url: tracesEndpoint,
            headers: config.exportHeaders
          })
        )
      ]
    });
    tracerProvider.register();
    const metricsEndpoint = `${config.otlpEndpoint}/v1/metrics`;
    const meterProvider = new MeterProvider({
      resource,
      readers: [
        new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter({
            url: metricsEndpoint,
            headers: config.exportHeaders
          })
        })
      ]
    });
    metrics.setGlobalMeterProvider(meterProvider);
    const logsEndpoint = `${config.otlpEndpoint}/v1/logs`;
    const loggerProvider = new LoggerProvider({
      resource,
      processors: [
        new BatchLogRecordProcessor(
          new OTLPLogExporter({
            url: logsEndpoint,
            headers: config.exportHeaders
          })
        )
      ]
    });
    logs.setGlobalLoggerProvider(loggerProvider);
    registerInstrumentations({
      instrumentations: [
        new DocumentLoadInstrumentation(),
        new FetchInstrumentation(),
        new LongTaskInstrumentation(),
        new UserInteractionInstrumentation(),
        new XMLHttpRequestInstrumentation(),
        new ExceptionInstrumentation()
      ]
    });
  }

  // lib/bundle.js
  globalThis["startBrowserSdk"] = startBrowserSdk;
})();
//# sourceMappingURL=elastic-otel-browser.js.map
