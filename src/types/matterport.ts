/**
 * TypeScript interfaces for Matterport 3D tour data
 */

export interface Position3D {
  x: number
  y: number
  z: number
}

export interface Quaternion {
  x: number
  y: number
  z: number
  w: number
}

export interface Sweep {
  model_id: string
  index: number
  sweep_uuid: string
  tags: string[]
  position: Position3D
  floor_position: Position3D
  floor_index: number
  room_index: number
  rotation: Quaternion
  neighbors: number[]
  sweep_name: string
  alignment_type: string
  placement: string
}

export interface CameraState {
  position: Position3D
  pitch: number
  yaw: number
}

export interface ViewURLState {
  sweep: string
  x: number
  y: number
  z: number
  pitch: number
  yaw: number
}
