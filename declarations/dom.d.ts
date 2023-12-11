interface GlobalEventHandlersEventMap {
  "controller:pause": CustomEvent<{ value: boolean }>;
  "controller:play": CustomEvent<{ value: boolean }>;
}
