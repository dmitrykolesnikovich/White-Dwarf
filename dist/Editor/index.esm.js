var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b ||= {})
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result)
    __defProp(target, key, result);
  return result;
};
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// submodules/ecsy/src/Utils.js
function queryKey(Components) {
  var ids = [];
  for (var n = 0; n < Components.length; n++) {
    var T = Components[n];
    if (!componentRegistered(T)) {
      throw new Error(`Tried to create a query with an unregistered component`);
    }
    if (typeof T === "object") {
      var operator = T.operator === "not" ? "!" : T.operator;
      ids.push(operator + T.Component._typeId);
    } else {
      ids.push(T._typeId);
    }
  }
  return ids.sort().join("-");
}
var hasWindow = typeof window !== "undefined";
var now = hasWindow && typeof window.performance !== "undefined" ? performance.now.bind(performance) : Date.now.bind(Date);
function componentRegistered(T) {
  return typeof T === "object" && T.Component._typeId !== void 0 || T.isComponent && T._typeId !== void 0;
}

// submodules/ecsy/src/SystemManager.js
var SystemManager = class {
  constructor(world) {
    this._systems = [];
    this._executeSystems = [];
    this.world = world;
    this.lastExecutedSystem = null;
  }
  registerSystem(SystemClass, attributes) {
    if (!SystemClass.isSystem) {
      throw new Error(
        `System '${SystemClass.name}' does not extend 'System' class`
      );
    }
    if (this.getSystem(SystemClass) !== void 0) {
      console.warn(`System '${SystemClass.getName()}' already registered.`);
      return this;
    }
    var system = new SystemClass(this.world, attributes);
    if (system.init)
      system.init(attributes);
    system.order = this._systems.length;
    this._systems.push(system);
    if (system.execute) {
      this._executeSystems.push(system);
      this.sortSystems();
    }
    return this;
  }
  unregisterSystem(SystemClass) {
    let system = this.getSystem(SystemClass);
    if (system === void 0) {
      console.warn(
        `Can unregister system '${SystemClass.getName()}'. It doesn't exist.`
      );
      return this;
    }
    this._systems.splice(this._systems.indexOf(system), 1);
    if (system.execute) {
      this._executeSystems.splice(this._executeSystems.indexOf(system), 1);
    }
    return this;
  }
  sortSystems() {
    this._executeSystems.sort((a, b) => {
      return a.priority - b.priority || a.order - b.order;
    });
  }
  getSystem(SystemClass) {
    return this._systems.find((s) => s instanceof SystemClass);
  }
  getSystems() {
    return this._systems;
  }
  removeSystem(SystemClass) {
    var index = this._systems.indexOf(SystemClass);
    if (!~index)
      return;
    this._systems.splice(index, 1);
  }
  executeSystem(system, delta, time) {
    if (system.initialized) {
      if (system.canExecute()) {
        let startTime = now();
        system.execute(delta, time);
        system.executeTime = now() - startTime;
        this.lastExecutedSystem = system;
        system.clearEvents();
      }
    }
  }
  stop() {
    this._executeSystems.forEach((system) => system.stop());
  }
  execute(delta, time, forcePlay) {
    this._executeSystems.forEach(
      (system) => (forcePlay || system.enabled) && this.executeSystem(system, delta, time)
    );
  }
  stats() {
    var stats = {
      numSystems: this._systems.length,
      systems: {}
    };
    for (var i = 0; i < this._systems.length; i++) {
      var system = this._systems[i];
      var systemStats = stats.systems[system.getName()] = {
        queries: {},
        executeTime: system.executeTime
      };
      for (var name in system.ctx) {
        systemStats.queries[name] = system.ctx[name].stats();
      }
    }
    return stats;
  }
};

// submodules/ecsy/src/ObjectPool.js
var ObjectPool = class {
  constructor(T, initialSize) {
    this.freeList = [];
    this.count = 0;
    this.T = T;
    this.isObjectPool = true;
    if (typeof initialSize !== "undefined") {
      this.expand(initialSize);
    }
  }
  acquire() {
    if (this.freeList.length <= 0) {
      this.expand(Math.round(this.count * 0.2) + 1);
    }
    var item = this.freeList.pop();
    return item;
  }
  release(item) {
    item.reset();
    this.freeList.push(item);
  }
  expand(count) {
    for (var n = 0; n < count; n++) {
      var clone = new this.T();
      clone._pool = this;
      this.freeList.push(clone);
    }
    this.count += count;
  }
  totalSize() {
    return this.count;
  }
  totalFree() {
    return this.freeList.length;
  }
  totalUsed() {
    return this.count - this.freeList.length;
  }
};

// submodules/ecsy/src/EventDispatcher.js
var EventDispatcher = class {
  constructor() {
    this._listeners = {};
    this.stats = {
      fired: 0,
      handled: 0
    };
  }
  addEventListener(eventName, listener) {
    let listeners = this._listeners;
    if (listeners[eventName] === void 0) {
      listeners[eventName] = [];
    }
    if (listeners[eventName].indexOf(listener) === -1) {
      listeners[eventName].push(listener);
    }
  }
  hasEventListener(eventName, listener) {
    return this._listeners[eventName] !== void 0 && this._listeners[eventName].indexOf(listener) !== -1;
  }
  removeEventListener(eventName, listener) {
    var listenerArray = this._listeners[eventName];
    if (listenerArray !== void 0) {
      var index = listenerArray.indexOf(listener);
      if (index !== -1) {
        listenerArray.splice(index, 1);
      }
    }
  }
  dispatchEvent(eventName, entity, component) {
    this.stats.fired++;
    var listenerArray = this._listeners[eventName];
    if (listenerArray !== void 0) {
      var array = listenerArray.slice(0);
      for (var i = 0; i < array.length; i++) {
        array[i].call(this, entity, component);
      }
    }
  }
  resetCounters() {
    this.stats.fired = this.stats.handled = 0;
  }
};

// submodules/ecsy/src/Query.js
var Query = class {
  constructor(Components, manager) {
    this.Components = [];
    this.NotComponents = [];
    Components.forEach((component) => {
      if (typeof component === "object") {
        this.NotComponents.push(component.Component);
      } else {
        this.Components.push(component);
      }
    });
    if (this.Components.length === 0) {
      throw new Error("Can't create a query without components");
    }
    this.entities = [];
    this.eventDispatcher = new EventDispatcher();
    this.reactive = false;
    this.key = queryKey(Components);
    for (var i = 0; i < manager._entities.length; i++) {
      var entity = manager._entities[i];
      if (this.match(entity)) {
        entity.queries.push(this);
        this.entities.push(entity);
      }
    }
  }
  addEntity(entity) {
    entity.queries.push(this);
    this.entities.push(entity);
    this.eventDispatcher.dispatchEvent(Query.prototype.ENTITY_ADDED, entity);
  }
  removeEntity(entity) {
    let index = this.entities.indexOf(entity);
    if (~index) {
      this.entities.splice(index, 1);
      index = entity.queries.indexOf(this);
      entity.queries.splice(index, 1);
      this.eventDispatcher.dispatchEvent(
        Query.prototype.ENTITY_REMOVED,
        entity
      );
    }
  }
  match(entity) {
    return entity.hasAllComponents(this.Components) && !entity.hasAnyComponents(this.NotComponents);
  }
  toJSON() {
    return {
      key: this.key,
      reactive: this.reactive,
      components: {
        included: this.Components.map((C) => C.name),
        not: this.NotComponents.map((C) => C.name)
      },
      numEntities: this.entities.length
    };
  }
  stats() {
    return {
      numComponents: this.Components.length,
      numEntities: this.entities.length
    };
  }
};
Query.prototype.ENTITY_ADDED = "Query#ENTITY_ADDED";
Query.prototype.ENTITY_REMOVED = "Query#ENTITY_REMOVED";
Query.prototype.COMPONENT_CHANGED = "Query#COMPONENT_CHANGED";

// submodules/ecsy/src/QueryManager.js
var QueryManager = class {
  constructor(world) {
    this._world = world;
    this._queries = {};
  }
  onEntityRemoved(entity) {
    for (var queryName in this._queries) {
      var query = this._queries[queryName];
      if (entity.queries.indexOf(query) !== -1) {
        query.removeEntity(entity);
      }
    }
  }
  onEntityComponentAdded(entity, Component2) {
    for (var queryName in this._queries) {
      var query = this._queries[queryName];
      if (!!~query.NotComponents.indexOf(Component2) && ~query.entities.indexOf(entity)) {
        query.removeEntity(entity);
        continue;
      }
      if (!~query.Components.indexOf(Component2) || !query.match(entity) || ~query.entities.indexOf(entity))
        continue;
      query.addEntity(entity);
    }
  }
  onEntityComponentRemoved(entity, Component2) {
    for (var queryName in this._queries) {
      var query = this._queries[queryName];
      if (!!~query.NotComponents.indexOf(Component2) && !~query.entities.indexOf(entity) && query.match(entity)) {
        query.addEntity(entity);
        continue;
      }
      if (!!~query.Components.indexOf(Component2) && !!~query.entities.indexOf(entity) && !query.match(entity)) {
        query.removeEntity(entity);
        continue;
      }
    }
  }
  getQuery(Components) {
    var key = queryKey(Components);
    var query = this._queries[key];
    if (!query) {
      this._queries[key] = query = new Query(Components, this._world);
    }
    return query;
  }
  stats() {
    var stats = {};
    for (var queryName in this._queries) {
      stats[queryName] = this._queries[queryName].stats();
    }
    return stats;
  }
};

// submodules/ecsy/src/Component.js
var Component = class {
  constructor(props) {
    if (props !== false) {
      const schema = this.constructor.schema;
      for (const key in schema) {
        if (props && props.hasOwnProperty(key)) {
          this[key] = props[key];
        } else {
          const schemaProp = schema[key];
          if (schemaProp.hasOwnProperty("default")) {
            this[key] = schemaProp.type.clone(schemaProp.default);
          } else {
            const type = schemaProp.type;
            this[key] = type.clone(type.default);
          }
        }
      }
      if (process.env.NODE_ENV !== "production" && props !== void 0) {
        this.checkUndefinedAttributes(props);
      }
    }
    this.onComponentChanged = (component) => {
    };
    this._pool = null;
  }
  copy(source) {
    const schema = this.constructor.schema;
    for (const key in schema) {
      const prop = schema[key];
      if (source.hasOwnProperty(key)) {
        this[key] = prop.type.copy(source[key], this[key]);
      }
    }
    if (process.env.NODE_ENV !== "production") {
      this.checkUndefinedAttributes(source);
    }
    return this;
  }
  clone() {
    return new this.constructor().copy(this);
  }
  reset() {
    const schema = this.constructor.schema;
    for (const key in schema) {
      const schemaProp = schema[key];
      if (schemaProp.hasOwnProperty("default")) {
        this[key] = schemaProp.type.copy(schemaProp.default, this[key]);
      } else {
        const type = schemaProp.type;
        this[key] = type.copy(type.default, this[key]);
      }
    }
  }
  dispose() {
    if (this._pool) {
      this._pool.release(this);
    }
  }
  getName() {
    return this.constructor.getName();
  }
  checkUndefinedAttributes(src) {
    const schema = this.constructor.schema;
    Object.keys(src).forEach((srcKey) => {
      if (!schema.hasOwnProperty(srcKey)) {
        console.warn(
          `Trying to set attribute '${srcKey}' not defined in the '${this.constructor.name}' schema. Please fix the schema, the attribute value won't be set`
        );
      }
    });
  }
};
Component.schema = {};
Component.isComponent = true;
Component.getName = function() {
  return this.displayName || this.name;
};

// submodules/ecsy/src/SystemStateComponent.js
var SystemStateComponent = class extends Component {
};
SystemStateComponent.isSystemStateComponent = true;

// submodules/ecsy/src/EntityManager.js
var EntityPool = class extends ObjectPool {
  constructor(entityManager, entityClass, initialSize) {
    super(entityClass, void 0);
    this.entityManager = entityManager;
    if (typeof initialSize !== "undefined") {
      this.expand(initialSize);
    }
  }
  expand(count) {
    for (var n = 0; n < count; n++) {
      var clone = new this.T(this.entityManager);
      clone._pool = this;
      this.freeList.push(clone);
    }
    this.count += count;
  }
};
var EntityManager = class {
  constructor(world) {
    this.world = world;
    this.componentsManager = world.componentsManager;
    this._entities = [];
    this._nextEntityId = 0;
    this._entitiesByNames = {};
    this._queryManager = new QueryManager(this);
    this.eventDispatcher = new EventDispatcher();
    this._entityPool = new EntityPool(
      this,
      this.world.options.entityClass,
      this.world.options.entityPoolSize
    );
    this.entitiesWithComponentsToRemove = [];
    this.entitiesToRemove = [];
    this.deferredRemovalEnabled = true;
  }
  getEntityByName(name) {
    return this._entitiesByNames[name];
  }
  createEntity(name) {
    var entity = this._entityPool.acquire();
    entity.alive = true;
    entity.name = name || "";
    if (name) {
      if (this._entitiesByNames[name]) {
        console.warn(`Entity name '${name}' already exist`);
      } else {
        this._entitiesByNames[name] = entity;
      }
    }
    this._entities.push(entity);
    this.eventDispatcher.dispatchEvent(ENTITY_CREATED, entity);
    this.world.onEntityChanged.forEach((callback) => {
      callback(this._entities);
    });
    return entity;
  }
  entityAddComponent(entity, Component2, values) {
    if (typeof Component2._typeId === "undefined" && !this.world.componentsManager._ComponentsMap[Component2._typeId]) {
      throw new Error(
        `Attempted to add unregistered component "${Component2.getName()}"`
      );
    }
    if (~entity._ComponentTypes.indexOf(Component2)) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "Component type already exists on entity.",
          entity,
          Component2.getName()
        );
      }
      return;
    }
    entity._ComponentTypes.push(Component2);
    if (Component2.__proto__ === SystemStateComponent) {
      entity.numStateComponents++;
    }
    var componentPool = this.world.componentsManager.getComponentsPool(
      Component2
    );
    var component = componentPool ? componentPool.acquire() : new Component2(values);
    if (componentPool && values) {
      component.copy(values);
    }
    entity._components[Component2._typeId] = component;
    this._queryManager.onEntityComponentAdded(entity, Component2);
    this.world.componentsManager.componentAddedToEntity(Component2);
    this.eventDispatcher.dispatchEvent(COMPONENT_ADDED, entity, Component2);
  }
  entityRemoveComponent(entity, Component2, immediately) {
    var index = entity._ComponentTypes.indexOf(Component2);
    if (!~index)
      return;
    this.eventDispatcher.dispatchEvent(COMPONENT_REMOVE, entity, Component2);
    if (immediately) {
      this._entityRemoveComponentSync(entity, Component2, index);
    } else {
      if (entity._ComponentTypesToRemove.length === 0)
        this.entitiesWithComponentsToRemove.push(entity);
      entity._ComponentTypes.splice(index, 1);
      entity._ComponentTypesToRemove.push(Component2);
      entity._componentsToRemove[Component2._typeId] = entity._components[Component2._typeId];
      delete entity._components[Component2._typeId];
    }
    this._queryManager.onEntityComponentRemoved(entity, Component2);
    if (Component2.__proto__ === SystemStateComponent) {
      entity.numStateComponents--;
      if (entity.numStateComponents === 0 && !entity.alive) {
        entity.remove();
      }
    }
  }
  _entityRemoveComponentSync(entity, Component2, index) {
    entity._ComponentTypes.splice(index, 1);
    var component = entity._components[Component2._typeId];
    delete entity._components[Component2._typeId];
    component.dispose();
    this.world.componentsManager.componentRemovedFromEntity(Component2);
  }
  entityRemoveAllComponents(entity, immediately) {
    let Components = entity._ComponentTypes;
    for (let j = Components.length - 1; j >= 0; j--) {
      if (Components[j].__proto__ !== SystemStateComponent)
        this.entityRemoveComponent(entity, Components[j], immediately);
    }
  }
  removeEntity(entity, immediately) {
    var index = this._entities.indexOf(entity);
    if (!~index)
      throw new Error("Tried to remove entity not in list");
    entity.alive = false;
    this.entityRemoveAllComponents(entity, immediately);
    if (entity.numStateComponents === 0) {
      this.eventDispatcher.dispatchEvent(ENTITY_REMOVED, entity);
      this._queryManager.onEntityRemoved(entity);
      if (immediately === true) {
        this._releaseEntity(entity, index);
      } else {
        this.entitiesToRemove.push(entity);
      }
    }
  }
  _releaseEntity(entity, index) {
    this._entities.splice(index, 1);
    if (this._entitiesByNames[entity.name]) {
      delete this._entitiesByNames[entity.name];
    }
    entity._pool.release(entity);
    this.world.onEntityChanged.forEach((callback) => {
      callback(this._entities);
    });
  }
  removeAllEntities() {
    for (var i = this._entities.length - 1; i >= 0; i--) {
      this.removeEntity(this._entities[i]);
    }
  }
  processDeferredRemoval() {
    if (!this.deferredRemovalEnabled) {
      return;
    }
    for (let i = 0; i < this.entitiesToRemove.length; i++) {
      let entity = this.entitiesToRemove[i];
      let index = this._entities.indexOf(entity);
      this._releaseEntity(entity, index);
    }
    this.entitiesToRemove.length = 0;
    for (let i = 0; i < this.entitiesWithComponentsToRemove.length; i++) {
      let entity = this.entitiesWithComponentsToRemove[i];
      while (entity._ComponentTypesToRemove.length > 0) {
        let Component2 = entity._ComponentTypesToRemove.pop();
        var component = entity._componentsToRemove[Component2._typeId];
        delete entity._componentsToRemove[Component2._typeId];
        component.dispose();
        this.world.componentsManager.componentRemovedFromEntity(Component2);
      }
    }
    this.entitiesWithComponentsToRemove.length = 0;
  }
  queryComponents(Components) {
    return this._queryManager.getQuery(Components);
  }
  count() {
    return this._entities.length;
  }
  stats() {
    var stats = {
      numEntities: this._entities.length,
      numQueries: Object.keys(this._queryManager._queries).length,
      queries: this._queryManager.stats(),
      numComponentPool: Object.keys(this.componentsManager._componentPool).length,
      componentPool: {},
      eventDispatcher: this.eventDispatcher.stats
    };
    for (var ecsyComponentId in this.componentsManager._componentPool) {
      var pool = this.componentsManager._componentPool[ecsyComponentId];
      stats.componentPool[pool.T.getName()] = {
        used: pool.totalUsed(),
        size: pool.count
      };
    }
    return stats;
  }
};
var ENTITY_CREATED = "EntityManager#ENTITY_CREATE";
var ENTITY_REMOVED = "EntityManager#ENTITY_REMOVED";
var COMPONENT_ADDED = "EntityManager#COMPONENT_ADDED";
var COMPONENT_REMOVE = "EntityManager#COMPONENT_REMOVE";

// submodules/ecsy/src/ComponentManager.js
var ComponentManager = class {
  constructor() {
    this.Components = [];
    this._ComponentsMap = {};
    this._componentPool = {};
    this.numComponents = {};
    this.nextComponentId = 0;
  }
  hasComponent(Component2) {
    return this.Components.indexOf(Component2) !== -1;
  }
  registerComponent(Component2, objectPool) {
    if (this.Components.indexOf(Component2) !== -1) {
      console.warn(
        `Component type: '${Component2.getName()}' already registered.`
      );
      return;
    }
    const schema = Component2.schema;
    if (!schema) {
      throw new Error(
        `Component "${Component2.getName()}" has no schema property.`
      );
    }
    for (const propName in schema) {
      const prop = schema[propName];
      if (!prop.type) {
        throw new Error(
          `Invalid schema for component "${Component2.getName()}". Missing type for "${propName}" property.`
        );
      }
    }
    Component2._typeId = this.nextComponentId++;
    this.Components.push(Component2);
    this._ComponentsMap[Component2._typeId] = Component2;
    this.numComponents[Component2._typeId] = 0;
    if (objectPool === void 0) {
      objectPool = new ObjectPool(Component2);
    } else if (objectPool === false) {
      objectPool = void 0;
    }
    this._componentPool[Component2._typeId] = objectPool;
  }
  componentAddedToEntity(Component2) {
    this.numComponents[Component2._typeId]++;
  }
  componentRemovedFromEntity(Component2) {
    this.numComponents[Component2._typeId]--;
  }
  getComponentsPool(Component2) {
    return this._componentPool[Component2._typeId];
  }
};

// submodules/ecsy/src/Version.js
var Version = "0.3.1";

// submodules/ecsy/src/WrapImmutableComponent.js
var proxyMap = /* @__PURE__ */ new WeakMap();
var proxyHandler = {
  set(target, prop) {
    throw new Error(
      `Tried to write to "${target.constructor.getName()}#${String(
        prop
      )}" on immutable component. Use .getMutableComponent() to modify a component.`
    );
  }
};
function wrapImmutableComponent(T, component) {
  if (component === void 0) {
    return void 0;
  }
  let wrappedComponent = proxyMap.get(component);
  if (!wrappedComponent) {
    wrappedComponent = new Proxy(component, proxyHandler);
    proxyMap.set(component, wrappedComponent);
  }
  return wrappedComponent;
}

// submodules/ecsy/src/Entity.js
var Entity = class {
  constructor(entityManager) {
    this._entityManager = entityManager || null;
    this.id = entityManager._nextEntityId++;
    this.name = "";
    this._ComponentTypes = [];
    this._components = {};
    this._componentsToRemove = {};
    this.queries = [];
    this._ComponentTypesToRemove = [];
    this.alive = false;
    this.numStateComponents = 0;
  }
  getComponent(Component2, includeRemoved) {
    var component = this._components[Component2._typeId];
    if (!component && includeRemoved === true) {
      component = this._componentsToRemove[Component2._typeId];
    }
    return process.env.NODE_ENV !== "production" ? wrapImmutableComponent(Component2, component) : component;
  }
  getRemovedComponent(Component2) {
    const component = this._componentsToRemove[Component2._typeId];
    return process.env.NODE_ENV !== "production" ? wrapImmutableComponent(Component2, component) : component;
  }
  getComponents() {
    return this._components;
  }
  getComponentsToRemove() {
    return this._componentsToRemove;
  }
  getComponentTypes() {
    return this._ComponentTypes;
  }
  getMutableComponent(Component2) {
    var component = this._components[Component2._typeId];
    if (!component) {
      return;
    }
    for (var i = 0; i < this.queries.length; i++) {
      var query = this.queries[i];
      if (query.reactive && query.Components.indexOf(Component2) !== -1) {
        query.eventDispatcher.dispatchEvent(
          Query.prototype.COMPONENT_CHANGED,
          this,
          component
        );
      }
    }
    component.onComponentChanged(component);
    return component;
  }
  addComponent(Component2, values) {
    this._entityManager.entityAddComponent(this, Component2, values);
    return this;
  }
  removeComponent(Component2, forceImmediate) {
    this._entityManager.entityRemoveComponent(this, Component2, forceImmediate);
    return this;
  }
  hasComponent(Component2, includeRemoved) {
    return !!~this._ComponentTypes.indexOf(Component2) || includeRemoved === true && this.hasRemovedComponent(Component2);
  }
  hasRemovedComponent(Component2) {
    return !!~this._ComponentTypesToRemove.indexOf(Component2);
  }
  hasAllComponents(Components) {
    for (var i = 0; i < Components.length; i++) {
      if (!this.hasComponent(Components[i]))
        return false;
    }
    return true;
  }
  hasAnyComponents(Components) {
    for (var i = 0; i < Components.length; i++) {
      if (this.hasComponent(Components[i]))
        return true;
    }
    return false;
  }
  removeAllComponents(forceImmediate) {
    return this._entityManager.entityRemoveAllComponents(this, forceImmediate);
  }
  copy(src) {
    for (var ecsyComponentId in src._components) {
      var srcComponent = src._components[ecsyComponentId];
      this.addComponent(srcComponent.constructor);
      var component = this.getComponent(srcComponent.constructor);
      component.copy(srcComponent);
    }
    return this;
  }
  clone() {
    return new Entity(this._entityManager).copy(this);
  }
  reset() {
    this.id = this._entityManager._nextEntityId++;
    this._ComponentTypes.length = 0;
    this.queries.length = 0;
    for (var ecsyComponentId in this._components) {
      delete this._components[ecsyComponentId];
    }
  }
  remove(forceImmediate) {
    return this._entityManager.removeEntity(this, forceImmediate);
  }
};

// submodules/ecsy/src/World.js
var DEFAULT_OPTIONS = {
  entityPoolSize: 0,
  entityClass: Entity
};
var World = class {
  constructor(options = {}) {
    this.options = Object.assign({}, DEFAULT_OPTIONS, options);
    this.componentsManager = new ComponentManager(this);
    this.entityManager = new EntityManager(this);
    this.systemManager = new SystemManager(this);
    this.onEntityChanged = [];
    this.enabled = true;
    this.eventQueues = {};
    if (hasWindow && typeof CustomEvent !== "undefined") {
      var event = new CustomEvent("ecsy-world-created", {
        detail: { world: this, version: Version }
      });
      window.dispatchEvent(event);
    }
    this.lastTime = now() / 1e3;
  }
  registerComponent(Component2, objectPool) {
    this.componentsManager.registerComponent(Component2, objectPool);
    return this;
  }
  registerSystem(System2, attributes) {
    this.systemManager.registerSystem(System2, attributes);
    return this;
  }
  hasRegisteredComponent(Component2) {
    return this.componentsManager.hasComponent(Component2);
  }
  unregisterSystem(System2) {
    this.systemManager.unregisterSystem(System2);
    return this;
  }
  getSystem(SystemClass) {
    return this.systemManager.getSystem(SystemClass);
  }
  getSystems() {
    return this.systemManager.getSystems();
  }
  execute(delta, time) {
    if (!delta) {
      time = now() / 1e3;
      delta = time - this.lastTime;
      this.lastTime = time;
    }
    if (this.enabled) {
      this.systemManager.execute(delta, time);
      this.entityManager.processDeferredRemoval();
    }
  }
  stop() {
    this.enabled = false;
  }
  play() {
    this.enabled = true;
  }
  createEntity(name) {
    return this.entityManager.createEntity(name);
  }
  stats() {
    var stats = {
      entities: this.entityManager.stats(),
      system: this.systemManager.stats()
    };
    return stats;
  }
};

// src/Core/index.ts
var mainWorld = new World();
var physicsWorld = new World();
var timeContext = {
  startTime: 0,
  currentTime: 0,
  deltaTime: 0,
  timeScale: 1,
  fixedTimeStep: 1 / 60
};
var mainUpdate = () => {
  let currentTime = Date.now() / 1e3;
  timeContext.deltaTime = (currentTime - timeContext.currentTime) * timeContext.timeScale;
  timeContext.currentTime = currentTime;
  mainWorld.execute(timeContext.deltaTime);
  requestAnimationFrame(mainUpdate);
};
var physicsUpdate = () => __async(void 0, null, function* () {
  while (true) {
    physicsWorld.execute(timeContext.fixedTimeStep);
    yield new Promise(
      (resolve) => setTimeout(resolve, timeContext.fixedTimeStep * 1e3)
    );
  }
});
var mainInit = () => {
  timeContext.startTime = Date.now() / 1e3;
  timeContext.currentTime = timeContext.startTime;
  timeContext.deltaTime = 0;
  requestAnimationFrame(mainUpdate);
  physicsUpdate();
};
var resetWorld = () => {
  mainWorld = new World();
  physicsWorld = new World();
};

// src/Editor/EditorContext.ts
var editorRenderContext = {
  mainCanvas: null,
  mainCamera: null
};
var editorUIContext = {
  entityLists: null,
  entityInspector: null,
  playButton: null,
  entityNameInput: null,
  createEntityButton: null
};
var editorEventContext = {
  onEntitySelected: []
};

// src/Core/ComponentRegistry.ts
var IComponent;
((IComponent2) => {
  const implementations = [];
  function getImplementations() {
    return implementations;
  }
  IComponent2.getImplementations = getImplementations;
  function register(ctor) {
    implementations.push(ctor);
    return ctor;
  }
  IComponent2.register = register;
})(IComponent || (IComponent = {}));

// submodules/ecsy/src/System.js
var System = class {
  canExecute() {
    if (this._mandatoryQueries.length === 0)
      return true;
    for (let i = 0; i < this._mandatoryQueries.length; i++) {
      var query = this._mandatoryQueries[i];
      if (query.entities.length === 0) {
        return false;
      }
    }
    return true;
  }
  getName() {
    return this.constructor.getName();
  }
  constructor(world, attributes) {
    this.world = world;
    this.enabled = true;
    this._queries = {};
    this.queries = {};
    this.priority = 0;
    this.executeTime = 0;
    if (attributes && attributes.priority) {
      this.priority = attributes.priority;
    }
    this._mandatoryQueries = [];
    this.initialized = true;
    if (this.constructor.queries) {
      for (var queryName in this.constructor.queries) {
        var queryConfig = this.constructor.queries[queryName];
        var Components = queryConfig.components;
        if (!Components || Components.length === 0) {
          throw new Error("'components' attribute can't be empty in a query");
        }
        let unregisteredComponents = Components.filter(
          (Component2) => !componentRegistered(Component2)
        );
        if (unregisteredComponents.length > 0) {
          throw new Error(
            `Tried to create a query '${this.constructor.name}.${queryName}' with unregistered components: [${unregisteredComponents.map((c) => c.getName()).join(", ")}]`
          );
        }
        var query = this.world.entityManager.queryComponents(Components);
        this._queries[queryName] = query;
        if (queryConfig.mandatory === true) {
          this._mandatoryQueries.push(query);
        }
        this.queries[queryName] = {
          results: query.entities
        };
        var validEvents = ["added", "removed", "changed"];
        const eventMapping = {
          added: Query.prototype.ENTITY_ADDED,
          removed: Query.prototype.ENTITY_REMOVED,
          changed: Query.prototype.COMPONENT_CHANGED
        };
        if (queryConfig.listen) {
          validEvents.forEach((eventName) => {
            if (!this.execute) {
              console.warn(
                `System '${this.getName()}' has defined listen events (${validEvents.join(
                  ", "
                )}) for query '${queryName}' but it does not implement the 'execute' method.`
              );
            }
            if (queryConfig.listen[eventName]) {
              let event = queryConfig.listen[eventName];
              if (eventName === "changed") {
                query.reactive = true;
                if (event === true) {
                  let eventList = this.queries[queryName][eventName] = [];
                  query.eventDispatcher.addEventListener(
                    Query.prototype.COMPONENT_CHANGED,
                    (entity) => {
                      if (eventList.indexOf(entity) === -1) {
                        eventList.push(entity);
                      }
                    }
                  );
                } else if (Array.isArray(event)) {
                  let eventList = this.queries[queryName][eventName] = [];
                  query.eventDispatcher.addEventListener(
                    Query.prototype.COMPONENT_CHANGED,
                    (entity, changedComponent) => {
                      if (event.indexOf(changedComponent.constructor) !== -1 && eventList.indexOf(entity) === -1) {
                        eventList.push(entity);
                      }
                    }
                  );
                } else {
                }
              } else {
                let eventList = this.queries[queryName][eventName] = [];
                query.eventDispatcher.addEventListener(
                  eventMapping[eventName],
                  (entity) => {
                    if (eventList.indexOf(entity) === -1)
                      eventList.push(entity);
                  }
                );
              }
            }
          });
        }
      }
    }
  }
  stop() {
    this.executeTime = 0;
    this.enabled = false;
  }
  play() {
    this.enabled = true;
  }
  clearEvents() {
    for (let queryName in this.queries) {
      var query = this.queries[queryName];
      if (query.added) {
        query.added.length = 0;
      }
      if (query.removed) {
        query.removed.length = 0;
      }
      if (query.changed) {
        if (Array.isArray(query.changed)) {
          query.changed.length = 0;
        } else {
          for (let name in query.changed) {
            query.changed[name].length = 0;
          }
        }
      }
    }
  }
  toJSON() {
    var json = {
      name: this.getName(),
      enabled: this.enabled,
      executeTime: this.executeTime,
      priority: this.priority,
      queries: {}
    };
    if (this.constructor.queries) {
      var queries = this.constructor.queries;
      for (let queryName in queries) {
        let query = this.queries[queryName];
        let queryDefinition = queries[queryName];
        let jsonQuery = json.queries[queryName] = {
          key: this._queries[queryName].key
        };
        jsonQuery.mandatory = queryDefinition.mandatory === true;
        jsonQuery.reactive = queryDefinition.listen && (queryDefinition.listen.added === true || queryDefinition.listen.removed === true || queryDefinition.listen.changed === true || Array.isArray(queryDefinition.listen.changed));
        if (jsonQuery.reactive) {
          jsonQuery.listen = {};
          const methods = ["added", "removed", "changed"];
          methods.forEach((method) => {
            if (query[method]) {
              jsonQuery.listen[method] = {
                entities: query[method].length
              };
            }
          });
        }
      }
    }
    return json;
  }
};
System.isSystem = true;
System.getName = function() {
  return this.displayName || this.name;
};

// submodules/ecsy/src/Types.js
var copyValue = (src) => src;
var cloneValue = (src) => src;
var copyArray = (src, dest) => {
  if (!src) {
    return src;
  }
  if (!dest) {
    return src.slice();
  }
  dest.length = 0;
  for (let i = 0; i < src.length; i++) {
    dest.push(src[i]);
  }
  return dest;
};
var cloneArray = (src) => src && src.slice();
var copyJSON = (src) => JSON.parse(JSON.stringify(src));
var cloneJSON = (src) => JSON.parse(JSON.stringify(src));
var copyCopyable = (src, dest) => {
  if (!src) {
    return src;
  }
  if (!dest) {
    return src.clone();
  }
  return dest.copy(src);
};
var cloneClonable = (src) => src && src.clone();
function createType(typeDefinition) {
  var mandatoryProperties = ["name", "default", "copy", "clone"];
  var undefinedProperties = mandatoryProperties.filter((p) => {
    return !typeDefinition.hasOwnProperty(p);
  });
  if (undefinedProperties.length > 0) {
    throw new Error(
      `createType expects a type definition with the following properties: ${undefinedProperties.join(
        ", "
      )}`
    );
  }
  typeDefinition.isType = true;
  return typeDefinition;
}
var Types = {
  Number: createType({
    name: "Number",
    default: 0,
    copy: copyValue,
    clone: cloneValue
  }),
  Boolean: createType({
    name: "Boolean",
    default: false,
    copy: copyValue,
    clone: cloneValue
  }),
  String: createType({
    name: "String",
    default: "",
    copy: copyValue,
    clone: cloneValue
  }),
  Array: createType({
    name: "Array",
    default: [],
    copy: copyArray,
    clone: cloneArray
  }),
  Ref: createType({
    name: "Ref",
    default: void 0,
    copy: copyValue,
    clone: cloneValue
  }),
  JSON: createType({
    name: "JSON",
    default: null,
    copy: copyJSON,
    clone: cloneJSON
  })
};

// src/Mathematics/Vector2.ts
import { vec2 } from "gl-matrix";
var Vector2 = class {
  constructor(x, y) {
    this.value = vec2.fromValues(x, y);
  }
  set(x, y) {
    this.value = vec2.fromValues(x, y);
  }
  copy(v) {
    this.value = vec2.copy(this.value, v.value);
    return this;
  }
  clone() {
    return new Vector2(this.value[0], this.value[1]);
  }
};
var Vector2Type = createType({
  name: "Vector2",
  default: new Vector2(0, 0),
  copy: copyCopyable,
  clone: cloneClonable
});

// src/Core/Render/DataComponent/ImageRenderData2D.ts
var ImageRenderData2D = class extends Component {
  constructor() {
    super(...arguments);
    this.src = "";
    this.img = null;
  }
};
ImageRenderData2D.schema = {
  src: {
    type: Types.String,
    default: ""
  },
  img: {
    type: Types.Ref,
    default: null
  },
  imageCenter: {
    type: Vector2Type,
    default: new Vector2(0, 0)
  }
};
ImageRenderData2D = __decorateClass([
  IComponent.register
], ImageRenderData2D);

// src/Core/Render/System/BuildInRenderers/Canvas2DImageLoader.ts
var Canvas2DImageLoader = class extends System {
  execute(delta, time) {
    this.queries.imageEntities.results.forEach((imageEntity) => {
      const imageRenderData = imageEntity.getMutableComponent(
        ImageRenderData2D
      );
      const img = new Image();
      img.src = imageRenderData.src;
      img.onload = () => {
        imageRenderData.img = img;
      };
    });
  }
};
Canvas2DImageLoader.queries = {
  imageEntities: {
    components: [ImageRenderData2D],
    listen: {
      added: true,
      changed: true
    }
  }
};

// src/Core/Render/System/BuildInRenderers/Canvas2DImageRenderer.ts
import { mat3 as mat32, vec2 as vec23 } from "gl-matrix";

// src/Core/Locomotion/DataComponent/TransformData2D.ts
var TransformData2D = class extends Component {
};
TransformData2D.schema = {
  position: {
    type: Vector2Type,
    default: new Vector2(0, 0)
  },
  rotation: {
    type: Types.Number,
    default: 0
  },
  scale: {
    type: Vector2Type,
    default: new Vector2(1, 1)
  }
};
TransformData2D = __decorateClass([
  IComponent.register
], TransformData2D);

// src/Core/Render/System/Canvas2DRenderer.ts
import { mat3, vec2 as vec22 } from "gl-matrix";

// src/Core/Render/DataComponent/CameraData2D.ts
var CameraData2D = class extends Component {
};
CameraData2D.schema = {
  backgroundType: {
    type: Types.Number,
    default: 0 /* Color */
  },
  backgroundColor: {
    type: Types.String,
    default: "#000000"
  },
  backgroundTexture: {
    type: Types.String,
    default: ""
  }
};
CameraData2D = __decorateClass([
  IComponent.register
], CameraData2D);

// submodules/ecsy/src/TagComponent.js
var TagComponent = class extends Component {
  constructor() {
    super(false);
  }
};
TagComponent.isTagComponent = true;

// src/Core/Render/TagComponent/MainCameraTag.ts
var MainCameraTag = class extends TagComponent {
};
MainCameraTag = __decorateClass([
  IComponent.register
], MainCameraTag);

// src/Core/Render/System/Canvas2DRenderer.ts
var Canvas2DRenderer = class extends System {
  init(attributes) {
    this.mainCanvas = attributes == null ? void 0 : attributes.mainCanvas;
    this.canvasContext = this.mainCanvas.getContext(
      "2d"
    );
  }
  execute(delta, time) {
    if (this.queries.mainCamera.results.length === 0) {
      throw new Error("Main camera not found.");
    } else if (this.queries.mainCamera.results.length > 1) {
      throw new Error("More than one main camera found.");
    }
  }
  worldToCamera(camTransform, canvasSize) {
    const worldToCamera = mat3.create();
    mat3.fromTranslation(
      worldToCamera,
      vec22.fromValues(canvasSize[0] / 2, canvasSize[1] / 2)
    );
    mat3.translate(
      worldToCamera,
      worldToCamera,
      vec22.negate(vec22.create(), camTransform.position.value)
    );
    mat3.rotate(worldToCamera, worldToCamera, camTransform.rotation);
    mat3.scale(worldToCamera, worldToCamera, camTransform.scale.value);
    return worldToCamera;
  }
  objectToWorld(objTransform) {
    const objectToWorld = mat3.create();
    mat3.fromTranslation(objectToWorld, objTransform.position.value);
    mat3.rotate(objectToWorld, objectToWorld, objTransform.rotation);
    mat3.scale(objectToWorld, objectToWorld, objTransform.scale.value);
    return objectToWorld;
  }
};
Canvas2DRenderer.queries = {
  mainCamera: {
    components: [MainCameraTag, CameraData2D, TransformData2D]
  }
};

// src/Core/Render/System/BuildInRenderers/Canvas2DImageRenderer.ts
var _Canvas2DImageRenderer = class extends Canvas2DRenderer {
  execute(delta, time) {
    try {
      super.execute(delta, time);
    } catch (error) {
      console.warn(error);
      return;
    }
    const cameraTransform = this.queries.mainCamera.results[0].getComponent(
      TransformData2D
    );
    const canvasSize = vec23.fromValues(
      this.mainCanvas.width,
      this.mainCanvas.height
    );
    const worldToCamera = this.worldToCamera(cameraTransform, canvasSize);
    this.queries.imageEntities.results.forEach((imageEntity) => {
      const imageTransform = imageEntity.getComponent(
        TransformData2D
      );
      const imageRenderData = imageEntity.getComponent(
        ImageRenderData2D
      );
      if (!imageRenderData.img)
        return;
      const objectToWorld = this.objectToWorld(imageTransform);
      const imageToObject = mat32.create();
      mat32.fromTranslation(
        imageToObject,
        vec23.negate(vec23.create(), imageRenderData.imageCenter.value)
      );
      const finalTransform = mat32.create();
      mat32.multiply(finalTransform, worldToCamera, objectToWorld);
      mat32.multiply(finalTransform, finalTransform, imageToObject);
      this.canvasContext.setTransform(
        finalTransform[0],
        finalTransform[1],
        finalTransform[3],
        finalTransform[4],
        finalTransform[6],
        finalTransform[7]
      );
      this.canvasContext.drawImage(imageRenderData.img, 0, 0);
      this.canvasContext.setTransform(1, 0, 0, 1, 0, 0);
    });
  }
};
var Canvas2DImageRenderer = _Canvas2DImageRenderer;
Canvas2DImageRenderer.queries = __spreadProps(__spreadValues({}, _Canvas2DImageRenderer.queries), {
  imageEntities: {
    components: [ImageRenderData2D, TransformData2D]
  }
});

// src/Core/Render/System/ClearCanvasSystem.ts
var ClearCanvasSystem = class extends System {
  init(attributes) {
    this.mainCanvas = attributes == null ? void 0 : attributes.mainCanvas;
    this.canvasContext = this.mainCanvas.getContext(
      "2d"
    );
  }
  execute(delta, time) {
    this.canvasContext.clearRect(
      0,
      0,
      this.mainCanvas.width,
      this.mainCanvas.height
    );
  }
};

// src/Core/Render/RenderSystemRegister.ts
var RenderSystemRegister = class {
  constructor(mainCanvas) {
    this.register = (world) => {
      world.registerSystem(ClearCanvasSystem, {
        mainCanvas: this.mainCanvas,
        priority: -100
      });
      world.registerSystem(Canvas2DImageLoader).registerSystem(Canvas2DImageRenderer, {
        mainCanvas: this.mainCanvas
      });
    };
    this.mainCanvas = mainCanvas;
  }
};

// src/Core/CoreSetup.ts
var coreSetup = () => {
  if (!editorRenderContext.mainCanvas) {
    throw new Error("Main canvas is not ready.");
  }
  let componentConstructors = IComponent.getImplementations();
  for (let i = 0; i < componentConstructors.length; i++) {
    mainWorld.registerComponent(componentConstructors[i]);
  }
  new RenderSystemRegister(editorRenderContext.mainCanvas).register(mainWorld);
};

// src/Core/Render/TagComponent/CameraTag.ts
var CameraTag = class extends TagComponent {
};
CameraTag = __decorateClass([
  IComponent.register
], CameraTag);

// src/Editor/EditorEntityListManager.ts
var updateEntityList = (entities) => {
  if (!editorUIContext.entityLists) {
    return;
  }
  for (let i = 0; i < editorUIContext.entityLists.length; i++) {
    const entityList = editorUIContext.entityLists[i];
    while (entityList.firstChild) {
      entityList.removeChild(entityList.firstChild);
    }
    for (let j = 0; j < entities.length; j++) {
      const entity = entities[j];
      const entityDiv = document.createElement("div");
      const entityName = document.createElement("span");
      entityName.innerText = entity.name === "" ? "Entity" : entity.name;
      entityDiv.appendChild(entityName);
      const entityId = document.createElement("span");
      entityId.innerText = entity.id.toString();
      entityDiv.appendChild(entityId);
      entityDiv.style.cursor = "pointer";
      entityDiv.className = "entityListItem";
      entityList.appendChild(entityDiv);
      entityDiv.onclick = () => {
        editorEventContext.onEntitySelected.forEach((callback) => {
          callback(entity);
        });
      };
    }
  }
};
var addNewEntity = (entityName) => {
  mainWorld.createEntity(entityName);
};

// src/Utils/System/CamDragSystem.ts
import { vec2 as vec24 } from "gl-matrix";
var CamDragSystem = class extends System {
  constructor() {
    super(...arguments);
    this.deltaPos = new Vector2(0, 0);
  }
  init(attributes) {
    this.mainCanvas = attributes == null ? void 0 : attributes.mainCanvas;
    this.canvasContext = this.mainCanvas.getContext(
      "2d"
    );
    this.mainCanvas.addEventListener("mousemove", (event) => {
      if (event.buttons === 2) {
        vec24.add(
          this.deltaPos.value,
          this.deltaPos.value,
          vec24.fromValues(-event.movementX, -event.movementY)
        );
      }
    });
  }
  execute(delta, time) {
    const mainCameraRes = this.queries.mainCamera.results;
    if (mainCameraRes.length !== 1) {
      return;
    }
    const mainCamera = mainCameraRes[0].getMutableComponent(
      TransformData2D
    );
    vec24.add(
      mainCamera.position.value,
      mainCamera.position.value,
      this.deltaPos.value
    );
    vec24.set(this.deltaPos.value, 0, 0);
  }
};
CamDragSystem.queries = {
  mainCamera: {
    components: [MainCameraTag, CameraData2D, TransformData2D]
  }
};

// src/Editor/System/EditorInspectorSystem.ts
import { mat3 as mat33, vec2 as vec25 } from "gl-matrix";
var highlightThreshold = 25;
var _EditorInspectorSystem = class extends Canvas2DRenderer {
  constructor() {
    super(...arguments);
    this.highlightEntity = null;
  }
  init(attributes) {
    super.init(attributes);
    this.mainCanvas.addEventListener("mousemove", (event) => {
      const mousePos = this.getMousePos(event);
      const mouseWorldPos = this.screenToWorld(mousePos);
      if (event.buttons === 1) {
        if (_EditorInspectorSystem.inspectEntity) {
          const transform = _EditorInspectorSystem.inspectEntity.getMutableComponent(
            TransformData2D
          );
          transform.position.copy(
            new Vector2(mouseWorldPos[0], mouseWorldPos[1])
          );
        }
      } else {
        let closestEntity = null;
        let closestDistance = Number.MAX_VALUE;
        this.queries.highlightEntity.results.forEach((entity) => {
          const transform = entity.getComponent(
            TransformData2D
          );
          const distance = vec25.distance(
            mouseWorldPos,
            transform.position.value
          );
          if (distance < highlightThreshold && distance < closestDistance) {
            closestEntity = entity;
            closestDistance = distance;
          }
        });
        this.highlightEntity = closestEntity;
      }
    });
    this.mainCanvas.addEventListener("mousedown", (event) => {
      if (event.button === 0) {
        if (this.highlightEntity) {
          _EditorInspectorSystem.updateEntityInspector(this.highlightEntity);
        } else {
          _EditorInspectorSystem.updateEntityInspector(null);
        }
      }
    });
  }
  execute(delta, time) {
    try {
      super.execute(delta, time);
    } catch (error) {
      console.warn(error);
      return;
    }
    const cameraTransform = this.queries.mainCamera.results[0].getComponent(
      TransformData2D
    );
    const canvasSize = vec25.fromValues(
      this.mainCanvas.width,
      this.mainCanvas.height
    );
    const worldToCamera = mat33.create();
    mat33.multiply(
      worldToCamera,
      worldToCamera,
      this.worldToCamera(cameraTransform, canvasSize)
    );
    if (_EditorInspectorSystem.inspectTransform) {
      const inspectObjToCamera = mat33.create();
      mat33.multiply(
        inspectObjToCamera,
        worldToCamera,
        this.objectToWorld(_EditorInspectorSystem.inspectTransform)
      );
      this.canvasContext.setTransform(
        inspectObjToCamera[0],
        inspectObjToCamera[1],
        inspectObjToCamera[3],
        inspectObjToCamera[4],
        inspectObjToCamera[6],
        inspectObjToCamera[7]
      );
      this.drawAxis();
    }
    if (this.highlightEntity) {
      const transform = this.highlightEntity.getComponent(
        TransformData2D
      );
      const highlightObjToCamera = mat33.create();
      mat33.multiply(
        highlightObjToCamera,
        worldToCamera,
        this.objectToWorld(transform)
      );
      this.canvasContext.setTransform(
        highlightObjToCamera[0],
        highlightObjToCamera[1],
        highlightObjToCamera[3],
        highlightObjToCamera[4],
        highlightObjToCamera[6],
        highlightObjToCamera[7]
      );
      this.drawHighlight();
    }
    this.canvasContext.setTransform(1, 0, 0, 1, 0, 0);
  }
  getMousePos(event) {
    const rect = this.mainCanvas.getBoundingClientRect();
    return vec25.fromValues(event.clientX - rect.left, event.clientY - rect.top);
  }
  screenToWorld(screenPos) {
    const cameraTransform = this.queries.mainCamera.results[0].getComponent(
      TransformData2D
    );
    const canvasSize = vec25.fromValues(
      this.mainCanvas.width,
      this.mainCanvas.height
    );
    const worldPos = vec25.create();
    vec25.transformMat3(
      worldPos,
      screenPos,
      mat33.invert(
        mat33.create(),
        this.worldToCamera(cameraTransform, canvasSize)
      )
    );
    return worldPos;
  }
  drawAxis() {
    this.canvasContext.beginPath();
    this.canvasContext.strokeStyle = "red";
    this.canvasContext.lineWidth = 2;
    this.canvasContext.moveTo(0, 0);
    this.canvasContext.lineTo(100, 0);
    this.canvasContext.stroke();
    this.canvasContext.beginPath();
    this.canvasContext.moveTo(100, 0);
    this.canvasContext.lineTo(100, 5);
    this.canvasContext.lineTo(110, 0);
    this.canvasContext.lineTo(100, -5);
    this.canvasContext.lineTo(100, 0);
    this.canvasContext.fillStyle = "red";
    this.canvasContext.fill();
    this.canvasContext.beginPath();
    this.canvasContext.strokeStyle = "blue";
    this.canvasContext.lineWidth = 2;
    this.canvasContext.moveTo(0, 0);
    this.canvasContext.lineTo(0, 100);
    this.canvasContext.stroke();
    this.canvasContext.beginPath();
    this.canvasContext.moveTo(0, 100);
    this.canvasContext.lineTo(5, 100);
    this.canvasContext.lineTo(0, 110);
    this.canvasContext.lineTo(-5, 100);
    this.canvasContext.lineTo(0, 100);
    this.canvasContext.fillStyle = "blue";
    this.canvasContext.fill();
    this.canvasContext.beginPath();
    this.canvasContext.fillStyle = "green";
    this.canvasContext.arc(0, 0, 5, 0, 2 * Math.PI);
    this.canvasContext.fill();
  }
  drawHighlight() {
    this.canvasContext.beginPath();
    this.canvasContext.strokeStyle = "blue";
    this.canvasContext.lineWidth = 2;
    this.canvasContext.arc(0, 0, highlightThreshold, 0, 2 * Math.PI);
    this.canvasContext.stroke();
  }
};
var EditorInspectorSystem = _EditorInspectorSystem;
EditorInspectorSystem.inspectEntity = null;
EditorInspectorSystem.inspectTransform = null;
EditorInspectorSystem.queries = __spreadProps(__spreadValues({}, _EditorInspectorSystem.queries), {
  highlightEntity: {
    components: [TransformData2D]
  }
});
EditorInspectorSystem.updateEntityInspector = (entity) => {
  _EditorInspectorSystem.inspectEntity = entity;
  if (entity == null ? void 0 : entity.hasComponent(TransformData2D)) {
    _EditorInspectorSystem.inspectTransform = entity.getComponent(
      TransformData2D
    );
  } else {
    _EditorInspectorSystem.inspectTransform = null;
  }
  _EditorInspectorSystem.displayEntityInspector(entity);
};
EditorInspectorSystem.displayEntityInspector = (entity) => {
  if (!editorUIContext.entityInspector) {
    return;
  }
  if (entity === null) {
    for (let i = 0; i < editorUIContext.entityInspector.length; i++) {
      const entityInspector = editorUIContext.entityInspector[i];
      while (entityInspector.firstChild) {
        entityInspector.removeChild(entityInspector.firstChild);
      }
    }
    return;
  }
  const components = entity.getComponents();
  const componentIndices = Object.keys(components);
  for (let i = 0; i < editorUIContext.entityInspector.length; i++) {
    const entityInspector = editorUIContext.entityInspector[i];
    while (entityInspector.firstChild) {
      entityInspector.removeChild(entityInspector.firstChild);
    }
    const entityOperationDiv = document.createElement("div");
    entityOperationDiv.className = "componentListItem";
    const removeEntityButton = document.createElement("button");
    removeEntityButton.innerText = "Remove Entity";
    removeEntityButton.style.width = "100%";
    removeEntityButton.onclick = () => {
      entity.remove();
      _EditorInspectorSystem.updateEntityInspector(null);
    };
    entityOperationDiv.appendChild(removeEntityButton);
    entityInspector.appendChild(entityOperationDiv);
    for (let j = 0; j < componentIndices.length; j++) {
      const componentIndex = componentIndices[j];
      const component = components[componentIndex];
      const componentDiv = document.createElement("div");
      const componentTitle = document.createElement("span");
      componentTitle.innerText = component.constructor.name;
      componentDiv.appendChild(componentTitle);
      const componentData = document.createElement("span");
      componentData.className = "textarea";
      componentData.contentEditable = "true";
      componentData.textContent = _EditorInspectorSystem.getComponentString(component);
      componentData.style.whiteSpace = "pre-wrap";
      componentData.style.resize = "none";
      componentDiv.appendChild(componentData);
      const removeButton = document.createElement("button");
      removeButton.innerText = "Remove";
      removeButton.onclick = () => {
        entity.removeComponent(Object.getPrototypeOf(component).constructor);
        _EditorInspectorSystem.updateEntityInspector(entity);
      };
      componentDiv.appendChild(removeButton);
      componentData.addEventListener("input", (event) => {
        const target = event.target;
        try {
          const newComponentData = JSON.parse(target.textContent || "{}");
          component.copy(newComponentData);
          entity.getMutableComponent(
            Object.getPrototypeOf(component).constructor
          );
        } catch (error) {
          console.error(error);
          return;
        }
      });
      component.onComponentChanged = (component2) => {
        if (document.activeElement !== componentData) {
          componentData.textContent = _EditorInspectorSystem.getComponentString(component2);
        }
      };
      componentDiv.className = "componentListItem";
      entityInspector.appendChild(componentDiv);
    }
    const componentAddDiv = document.createElement("div");
    componentAddDiv.className = "componentListItem";
    const componentNameInput = document.createElement("select");
    const componentList = IComponent.getImplementations();
    const componentNames = componentList.map((component) => component.name);
    for (let j = 0; j < componentNames.length; j++) {
      const componentName = componentNames[j];
      const option = document.createElement("option");
      option.value = componentName;
      option.innerText = componentName;
      componentNameInput.appendChild(option);
    }
    componentAddDiv.appendChild(componentNameInput);
    const addComponentButton = document.createElement("button");
    addComponentButton.style.width = "100%";
    addComponentButton.innerText = "Add Component";
    addComponentButton.onclick = () => {
      const componentList2 = IComponent.getImplementations();
      console.log(componentNameInput.value);
      let component = componentList2.find(
        (component2) => component2.name === componentNameInput.value
      );
      if (component) {
        entity.addComponent(component);
        _EditorInspectorSystem.updateEntityInspector(entity);
      } else {
        console.error("Component not found.");
      }
    };
    componentAddDiv.appendChild(addComponentButton);
    entityInspector.appendChild(componentAddDiv);
  }
};
EditorInspectorSystem.getComponentString = (component) => {
  const componentSchema = Object.getPrototypeOf(component).constructor.schema;
  const componentDataContent = {};
  Object.keys(component).forEach((key) => {
    if (Object.keys(componentSchema).includes(key) && componentSchema[key].type !== Types.Ref) {
      componentDataContent[key] = component[key];
    }
  });
  return JSON.stringify(componentDataContent, null, " ");
};

// src/Editor/EditorSystemRegister.ts
var EditorSystemRegister = class {
  constructor(mainCanvas) {
    this.register = (world) => {
      world.registerSystem(CamDragSystem, {
        mainCanvas: this.mainCanvas
      });
      world.registerSystem(EditorInspectorSystem, {
        mainCanvas: this.mainCanvas
      });
    };
    this.mainCanvas = mainCanvas;
  }
};

// src/Editor/TagComponent/EditorSceneCamTag.ts
var EditorSceneCamTag = class extends TagComponent {
};
EditorSceneCamTag = __decorateClass([
  IComponent.register
], EditorSceneCamTag);

// src/Editor/EditorInitialization.ts
var editorInitialization = () => {
  editorRenderContext.mainCanvas = document.getElementById(
    "mainCanvas"
  );
  editorUIContext.entityLists = document.getElementsByClassName(
    "entityList"
  );
  editorUIContext.entityInspector = document.getElementsByClassName(
    "entityInspector"
  );
  editorUIContext.playButton = document.getElementById(
    "playButton"
  );
  editorUIContext.entityNameInput = document.getElementById(
    "entityName"
  );
  editorUIContext.createEntityButton = document.getElementById(
    "createEntityButton"
  );
  editorRenderContext.mainCanvas.oncontextmenu = () => false;
  mainWorld.onEntityChanged.push(updateEntityList);
  editorEventContext.onEntitySelected.push(
    EditorInspectorSystem.updateEntityInspector
  );
  coreSetup();
  new EditorSystemRegister(editorRenderContext.mainCanvas).register(mainWorld);
  setupEditorSceneCamera();
  setupPlayButton();
  setupCreateEntityButton();
};
var setupEditorSceneCamera = () => {
  editorRenderContext.mainCamera = mainWorld.createEntity("EditorSceneCamera");
  editorRenderContext.mainCamera.addComponent(EditorSceneCamTag).addComponent(CameraTag).addComponent(MainCameraTag).addComponent(CameraData2D, {
    backgroundType: 0 /* Color */,
    backgroundColor: "#000000"
  }).addComponent(TransformData2D, {
    position: new Vector2(0, 0),
    scale: new Vector2(1, 1)
  });
  for (let i = 0; i < 5; i++) {
    const imageEntity = mainWorld.createEntity();
    let imageTarget = new Image();
    imageTarget.src = "https://picsum.photos/200";
    const position = new Vector2(
      Math.random() * 1e3 - 500,
      Math.random() * 1e3 - 500
    );
    imageEntity.addComponent(TransformData2D, {
      position,
      scale: new Vector2(1, 1)
    }).addComponent(ImageRenderData2D, {
      img: imageTarget,
      imageCenter: new Vector2(100, 100)
    });
  }
};
var setupPlayButton = () => {
  var _a;
  (_a = editorUIContext.playButton) == null ? void 0 : _a.addEventListener("click", () => {
    resetWorld();
    mainWorld.onEntityChanged.push(updateEntityList);
    editorEventContext.onEntitySelected.push(
      EditorInspectorSystem.updateEntityInspector
    );
    updateEntityList([]);
    EditorInspectorSystem.updateEntityInspector(null);
    coreSetup();
  });
};
var setupCreateEntityButton = () => {
  var _a;
  (_a = editorUIContext.createEntityButton) == null ? void 0 : _a.addEventListener("click", () => {
    if (editorUIContext.entityNameInput) {
      addNewEntity(editorUIContext.entityNameInput.value);
      editorUIContext.entityNameInput.value = "";
    } else {
      addNewEntity();
    }
  });
};

// src/Editor/index.ts
var main = () => {
  console.log("Editor Started");
  editorInitialization();
  mainInit();
  onResize();
};
var onResize = () => {
  if (editorRenderContext.mainCanvas) {
    editorRenderContext.mainCanvas.width = editorRenderContext.mainCanvas.clientWidth;
    editorRenderContext.mainCanvas.height = editorRenderContext.mainCanvas.clientHeight;
  }
};
window.onload = main;
window.onresize = onResize;
