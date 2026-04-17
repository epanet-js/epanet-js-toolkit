enum TimestepEvent {
  STEP_REPORT = 0, //!< A reporting time step has ended 
  STEP_HYD = 1, //!< A hydraulic time step has ended
  STEP_WQ = 2, //!< A water quality time step has ended
  STEP_TANKEVENT = 3, //!< A tank has become empty or full
  STEP_CONTROLEVENT = 4, //!< A link control needs to be activated
}

export default TimestepEvent;
