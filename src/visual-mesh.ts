import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import type { Scene } from "@babylonjs/core/scene";
import type { XYZ } from "./route";

export function pivot(name: string, parent: TransformNode, position: XYZ = [0, 0, 0]) {
  const node = new TransformNode(name, parent.getScene());
  node.parent = parent;
  node.position.set(...position);
  return node;
}

export function ellipsoid(name: string, parent: TransformNode, surface: StandardMaterial, center: XYZ, size: XYZ) {
  const mesh = CreateSphere(name, { diameter: 1, segments: 12 }, parent.getScene());
  mesh.parent = parent;
  mesh.position.set(...center);
  mesh.scaling.set(...size);
  mesh.material = surface;
  return mesh;
}

export function ovalBetween(name: string, parent: TransformNode, surface: StandardMaterial,
  start: XYZ, end: XYZ, width: number, depth = width) {
  const delta = new Vector3(...end).subtract(new Vector3(...start));
  const center: XYZ = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2];
  const mesh = ellipsoid(name, parent, surface, center, [width, delta.length() + width * 0.45, depth]);
  mesh.rotationQuaternion = Quaternion.FromUnitVectorsToRef(Vector3.Up(), delta.normalize(), Quaternion.Identity());
  return mesh;
}

type Facet = readonly [XYZ, XYZ, XYZ];

export function foldedMesh(scene: Scene, name: string, parent: TransformNode,
  surfaces: StandardMaterial[], folds: Facet[][]) {
  const meshes = folds.map((facets, index) => {
    const mesh = new Mesh(name, scene);
    mesh.parent = parent;
    mesh.material = surfaces[index];
    const data = new VertexData();
    data.positions = facets.flatMap((triangle) => triangle.flat());
    data.indices = data.positions.filter((_, i) => i % 3 === 0).map((_, i) => i);
    data.uvs = facets.flatMap(() => [0, 0, 1, 0, 0.5, 1]);
    data.normals = [];
    VertexData.ComputeNormals(data.positions, data.indices, data.normals);
    data.applyToMesh(mesh);
    return mesh;
  });
  return meshes;
}
