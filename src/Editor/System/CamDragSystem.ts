import { Attributes, System, SystemQueries } from "ecsy/System";
import { vec2 } from "gl-matrix";
import { TransformData2D } from "../../Core/Locomotion/DataComponent/TransformData2D";
import { CameraData2D } from "../../Core/Render/DataComponent/CameraData2D";
import { MainCameraTag } from "../../Core/Render/TagComponent/MainCameraTag";
import { Vector2 } from "../../Mathematics/Vector2";

/**
 * This system enables right click drag to move the camera around the scene.
 */
export class CamDragSystem extends System {
  static queries: SystemQueries = {
    mainCamera: {
      components: [MainCameraTag, CameraData2D, TransformData2D],
    },
  };

  mainCanvas!: HTMLCanvasElement;
  canvasContext!: CanvasRenderingContext2D;

  // The required movement of the camera.
  deltaPos: Vector2 = new Vector2(0, 0);

  init(attributes?: Attributes | undefined): void {
    this.mainCanvas = attributes?.mainCanvas;
    this.canvasContext = this.mainCanvas.getContext(
      "2d"
    ) as CanvasRenderingContext2D;

    // Listen to mouse move event.
    this.mainCanvas.addEventListener("mousemove", (event) => {
      // Check if the right mouse button is pressed.
      if (event.buttons === 2) {
        // Calculate the delta position.
        vec2.add(
          this.deltaPos.value,
          this.deltaPos.value,
          vec2.fromValues(-event.movementX, -event.movementY)
        );
      }
    });
  }

  execute(delta: number, time: number): void {
    // Get the main camera transform.
    const mainCamera = this.queries.mainCamera.results[0].getMutableComponent(
      TransformData2D
    ) as TransformData2D;

    // Move the camera.
    vec2.add(
      mainCamera.position.value,
      mainCamera.position.value,
      this.deltaPos.value
    );

    // Reset the delta position.
    vec2.set(this.deltaPos.value, 0, 0);
  }
}
