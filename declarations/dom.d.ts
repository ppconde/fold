interface GlobalEventHandlersEventMap {
  'controller:pause': CustomEvent<IControllerEvent>;
  'controller:step': CustomEvent<IControllerStepEvent>;
  'controller:speed': CustomEvent<IControllerSpeedEvent>;
  'controller:enable': CustomEvent<IControllerEvent>;
}
