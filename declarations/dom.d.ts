interface GlobalEventHandlersEventMap {
  'controller:pause': CustomEvent<IControllerEvent>;
  'controller:play': CustomEvent<IControllerEvent>;
  'controller:step': CustomEvent<IControllerStepEvent>;
  'controller:speed': CustomEvent<IControllerSpeedEvent>;
}
