export default class FixedUpdater {
  /**
   * How much time should pass between updates? (In milliseconds.)
   *
   * Setting this to a lower number (like 1000 / 120, or 120 FPS) will result in more calls.
   * Setting this to a higher number (like 1000 / 30, or 30 FPS) will result in fewer calls.
   */
  public fixedTimeStep = 1000 / 30;

  /**
   * The function to run during a fixed update.
   *
   * This might be called MANY times per second depending on your fixedTimeStep,
   * so try to keep the workload light.
   */
  private updateCallback: (fixedDeltaTime: number) => void = () => {};

  public constructor(
    fixedTimeStep: number,
    fn: (fixedDeltaTime: number) => void
  ) {
    this.fixedTimeStep = fixedTimeStep;
    this.updateCallback = fn;
  }

  /**
   * Internal tracker to determine how much time has elapsed wherien a fixed update did NOT run.
   * This effectively allows us to ensure we run the fixed update as many times as necessary.
   */
  private stepDelta = 0;

  /**
   * If we haven't run in `frameCap` frames, we will limit the number of frames that
   * will be ran at one time. This ultimately can result in inaccurate simulations,
   * but otherwise is a precaution against tying up the browser thread.
   *
   * If you **absolutely can not afford to drop frames** then you will want to remove this.
   */
  private frameCap = 50;

  /**
   * Tracks how much time has passed and fires the fixed update handler accordingly until "caught up."
   * @param   {number}  deltaTimeMS  The time since this function was last called.
   */
  public fixedUpdate = (deltaTimeMS: number) => {
    this.stepDelta += deltaTimeMS;

    if (this.stepDelta > this.fixedTimeStep * this.frameCap) {
      this.stepDelta = this.fixedTimeStep * this.frameCap;
    }

    // While we have fixed steps to take, run the given function.
    while (this.stepDelta >= this.fixedTimeStep) {
      this.stepDelta -= this.fixedTimeStep;
      this.updateCallback(this.fixedTimeStep);
    }
  };
}
