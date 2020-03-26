import * as THREE from 'three/build/three.module.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { GUI } from 'three/examples/jsm/libs/dat.gui.module.js';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';

var canvas;
var scene, renderer, camera;
var composer;
var stats, controls;
var mccPoints, mccInstancedMesh;
var mccParams = {
  index: 1
};
var colorMackay = getComputedStyle(document.getElementById("circle1")).backgroundColor;
var colorAntiMackay1 = getComputedStyle(document.getElementById("circle2")).backgroundColor;
var colorAntiMackay2 = getComputedStyle(document.getElementById("circle3")).backgroundColor;
var colorAntiMackay3 = getComputedStyle(document.getElementById("circle4")).backgroundColor;
var clickedOnce = false;

// List of Mackay layers, anti-Mackay layers and cutoff / confinement radii
const mccParamList = [
  [ 3, 0, 2.61], [ 3, 1,  3.41],
  [ 4, 0, 3.57], [ 4, 1,  4.12], [ 4, 2,  5.01],
  [ 5, 0, 4.29], [ 5, 1,  5.04], [ 5, 2,  6.01],
  [ 6, 0, 5.22], [ 6, 1,  6.01], [ 6, 2,  6.81], [ 6, 3,  7.39],
  [ 7, 0, 5.98], [ 7, 1,  6.70], [ 7, 2,  7.48], [ 7, 3,  8.32],
  [ 8, 0, 6.89], [ 8, 1,  7.63], [ 8, 2,  8.42], [ 8, 3,  9.02], [ 8, 4, 10.00],
  [ 9, 0, 7.82], [ 9, 1,  8.58], [ 9, 2,  9.14], [ 9, 3, 10.01], [ 9, 4, 10.77],
  [10, 0, 8.58], [10, 1,  9.30], [10, 2, 10.07], [10, 3, 11.00], [10, 4, 11.49], [10, 5, 12.31],
  [11, 0, 9.49], [11, 1, 10.23], [11, 2, 11.01], [11, 3, 11.59], [11, 4, 12.40]
];

var specularShininess = 50;
// var default_material = new THREE.MeshStandardMaterial( {
// 	roughness: 0.05
// } );
var default_material = new THREE.MeshPhongMaterial( {
  shininess: specularShininess
} );

var default_geometry = new THREE.SphereBufferGeometry(0.5, 16, 16);

default_material.vertexColors = true;
camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.z = 3.5 * mccParamList[mccParams.index][2];


init();
animate();


function switchMCC(scene, n, R){
  // Remove the old mcc from the scene
  if (typeof mccInstancedMesh !== 'undefined'){ scene.remove(mccInstancedMesh); }
  // Generate a new one
  mccPoints = generateMCC(n, R);
  mccInstancedMesh = convertMCCtoInstancedMesh(mccPoints);
  scene.add( mccInstancedMesh );
  // Adjust some things
  camera.position.z = 3.5 * R;
  controls.maxDistance = 5.0 * R;
  controls.minDistance = 1.0 * R + 1.0;
  camera.updateProjectionMatrix();
}


function init() {
  canvas = document.createElement( 'div' );
  document.body.appendChild( canvas );

  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  document.body.appendChild( renderer.domElement );

  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0, 0, 0 );
  // Add the content of the scene: the magic number cluster
  mccPoints = generateMCC(mccParamList[mccParams.index][0], mccParamList[mccParams.index][2]);
  mccInstancedMesh = convertMCCtoInstancedMesh(mccPoints);
  scene.add( mccInstancedMesh );
  // Add some lights
  scene.add( new THREE.AmbientLight(0xffffff, 0.6) );
  var light = new THREE.DirectionalLight(0xc7ebfd, 0.3);
  light.position.y = 100;
  light.castShadow = true;
  scene.add( light );

  // Define a composer for postprocessing (e.g. for ambient occlusion)
  composer = new EffectComposer( renderer );
  // Add ambient occlusion
  var ssaoPass = new SSAOPass( scene, camera, window.innerWidth, window.innerHeight );
  ssaoPass.kernelRadius = 6;
  ssaoPass.minDistance = 0.0005;
  composer.addPass( ssaoPass );

  // Init gui
  var gui = new GUI();
  // SSAO gui elements
  // gui.add( ssaoPass, 'output', {
  // 	'Default': SSAOPass.OUTPUT.Default,
  // 	'SSAO Only': SSAOPass.OUTPUT.SSAO,
  // 	'SSAO Only + Blur': SSAOPass.OUTPUT.Blur,
  // 	'Beauty': SSAOPass.OUTPUT.Beauty,
  // 	'Depth': SSAOPass.OUTPUT.Depth,
  // 	'Normal': SSAOPass.OUTPUT.Normal
  // } ).onChange( function ( value ) {
  // 	ssaoPass.output = parseInt( value );
  // } );
  // gui.add( ssaoPass, 'kernelRadius' ).min( 0 ).max( 32 );
  // gui.add( ssaoPass, 'minDistance' ).min( 0.0001 ).max( 0.005 );
  // gui.add( ssaoPass, 'maxDistance' ).min( 0.01 ).max( 0.3 );
  // MCC gui elements
  gui.add( mccParams, 'index', 0, mccParamList.length-1 ).step( 1 ).onChange( function ( value ) {
    var nMackay = mccParamList[mccParams.index][0];
    var nAntiMackay = mccParamList[mccParams.index][1];
    var radius = mccParamList[mccParams.index][2];
    switchMCC(scene, nMackay, radius);
    // Update the label on the page
    document.getElementById("MCCType").innerHTML = "Cluster: " + nMackay.toString() + "<sub>" + nAntiMackay.toString() + "</sub>";
  } );

  // Add some controls to rotate the cluster
  controls = new TrackballControls( camera, renderer.domElement );
  controls.rotateSpeed = 1.8;
  controls.zoomSpeed = 1.2;
  controls.dynamicDampingFactor = 0.2;
  controls.maxDistance = 5.0 * mccParamList[mccParams.index][2];
  controls.minDistance = 1.0 * mccParamList[mccParams.index][2] + 1.0;
  controls.noPan = true;

  // Add a callback to stop rotation once user rotates cluster manually
  function onClick() {
    clickedOnce = true;
  }
  document.addEventListener( 'click', onClick, false );

  // Add a callback to handle window resizes
  window.addEventListener( 'resize', onWindowResize, false );
}

function particleTypeToColor(type) {
  switch (type) {
    case 0: return new THREE.Color().setStyle(colorMackay);
    case 1: return new THREE.Color().setStyle(colorAntiMackay1);
    case 2: return new THREE.Color().setStyle(colorAntiMackay2);
    case 3: return new THREE.Color().setStyle(colorAntiMackay3);
  }
}

// Transform a list of particle positions & coordinates into an instanced mesh for rendering
function convertMCCtoInstancedMesh(mccPoints) {
  // Calculate sum of Mackay + anti-Mackay layers from length of the point array
  var nLayers = ((3.0 / 10.0) * mccPoints.length)**(1.0/3.0)
  // To make rendering more efficient, throw out some of the inner layers we can't see anyway
  if(nLayers > 6){
    var firstIndexToKeep = (10.0 / 3.0) * (nLayers-3)**3.0;
    // Since the array is sorted radially, we can just slice it
    var mccPointsToRender = mccPoints.slice(firstIndexToKeep, mccPoints.length);
  } else {
    var mccPointsToRender = mccPoints;
  }
  // Generate an instanced mesh that just copies the same sphere to all cluster positions
  var mesh = new THREE.InstancedMesh( default_geometry, default_material, mccPointsToRender.length );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  var matrix = new THREE.Matrix4();
  var colors = new Float32Array( mccPointsToRender.length * 3 );
  for (let i = 0; i < mccPointsToRender.length; i++) {
    matrix.setPosition(mccPointsToRender[i][0], mccPointsToRender[i][1], mccPointsToRender[i][2] );
    mesh.setMatrixAt( i, matrix );
    var type = mccPointsToRender[i][3];
    var color = particleTypeToColor(type);
    colors[3*i] = color.r; colors[3*i+1] = color.g; colors[3*i+2] = color.b;
  }
  default_geometry.setAttribute( 'color', new THREE.InstancedBufferAttribute( colors, 3 ) );
  return mesh;
}


// Generates a magic number colloidal crystal from of Mackay / anti-Mackay layers
function generateMCC(n, R) {
  // A Mackay cluster is built up of shells of icosahedra. An anti-Mackay layer is
  // obtained when an FCC stacking fault occurs in such a cluster.
  const tau = (1.0 + Math.sqrt(5.0)) / 2.0;
  const t = tau / Math.sqrt(tau + 2.0);
  const e = 1.0 / Math.sqrt(tau + 2.0);
  const icoVertices = [[ t,  e,  0], [ t, -e,  0], [ e,  0,  t], [ e,  0, -t],
    [ 0,  t,  e], [ 0,  t, -e], [ 0, -t,  e], [ 0, -t, -e],
    [-e,  0,  t], [-e,  0, -t], [-t,  e,  0], [-t, -e,  0]];
  const icoFaces = [[0,1,2], [0,1,3], [0,2,4], [0,3,5], [0,4,5],
    [1,2,6], [1,3,7], [1,6,7], [2,4,8], [2,6,8],
    [3,5,9], [3,7,9], [4,5,10], [4,8,10], [5,9,10],
    [6,8,11], [6,7,11], [7,9,11], [8,10,11], [9,10,11]];
  const icoEdges = [[0,1], [0,2], [0,3], [0,4], [0,5], [1,2],
    [1,3], [1,6], [1,7], [2,4], [2,6], [2,8],
    [3,5], [3,7], [3,9], [4,5], [4,8], [4,10],
    [5,9], [5,10], [6,7], [6,8], [6,11], [7,9],
    [7,11], [8,10], [8,11], [9,10], [9,11], [10,11]];
  var cluster = [];
  var v0 = [0, 0, 0];
  // part 1: center & faces (Mackay core + anti-Mackay faces)
  icoFaces.forEach(function(f) {
    // vertices
    var v1 = icoVertices[f[0]];
    var v2 = icoVertices[f[1]];
    var v3 = icoVertices[f[2]];
    // center part
    generateTetrahedron(cluster, n, v0, v1, v2, v3, 0);
    // face part
    var v4 = [(v1[0] + v2[0] + v3[0]) * 2.0 / 3.0,
      (v1[1] + v2[1] + v3[1]) * 2.0 / 3.0,
      (v1[2] + v2[2] + v3[2]) * 2.0 / 3.0];
    generateTetrahedron(cluster, n, v4, v1, v2, v3, 1);
  });
  // part 2: edges & vertices (Anti-Mackay edges & vertices)
  icoEdges.forEach(function(e) {
    // spanning vectors
    var v1 = icoVertices[e[0]];
    var v2 = icoVertices[e[1]];
    // normal vectors
    var s1 = (tau + 1.0) / 3.0;
    var u1 = [(v1[0] + v2[0]) * s1,
      (v1[1] + v2[1]) * s1,
      (v1[2] + v2[2]) * s1];
    var s2 = Math.sqrt(2.0 + tau) / 3.0;
    var u2 = [(v1[1] * v2[2] - v1[2] * v2[1]) * s2,
      (v1[2] * v2[0] - v1[0] * v2[2]) * s2,
      (v1[0] * v2[1] - v1[1] * v2[0]) * s2];
    // edge part, tetrahedron (1x volume)
    var v3 = [u1[0] - u2[0], u1[1] - u2[1], u1[2] - u2[2]];
    var v4 = [u1[0] + u2[0], u1[1] + u2[1], u1[2] + u2[2]];
    generateTetrahedron(cluster, n, v1, v2, v3, v4, 2);
    // vertex part, tetrahedron (2x volume)
    var v5 = [2 * v1[0], 2 * v1[1], 2 * v1[2]];
    var v6 = [2 * v2[0], 2 * v2[1], 2 * v2[2]];
    generateTetrahedron(cluster, n, v1, v5, v3, v4, 3);
    generateTetrahedron(cluster, n, v2, v6, v3, v4, 3);
  });
  // sort points in->outward, delete duplicates and truncate at radius R
  cluster.sort(comparePoints);
  // remove duplicates and particles outside of radius R
  var p0 = [-1, -1, -1];
  var clusterFiltered = [];
  cluster.forEach(function(p) {
    if(Math.abs(comparePoints(p,p0)) > 0){
      p0 = p;
      var rr = p[0] * p[0] + p[1] * p[1] + p[2] * p[2];
      if(rr <= R * R){ clusterFiltered.push(p); }
    }
  });
  cluster = clusterFiltered;
  return cluster;
}


// Generate particles in a tetrahedron spanned by four vertices
function generateTetrahedron(cluster, m, v0, v1, v2, v3, t) {
  // vectors spanning the lattice
  var d1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]]
  var d2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]]
  var d3 = [v3[0] - v0[0], v3[1] - v0[1], v3[2] - v0[2]]
  // place all particles
  for (let i1 = 0; i1 < m + 1; i1++) {
    for (let i2 = 0; i2 < m + 1 - i1; i2++) {
      for (let i3 = 0; i3 < m + 1 - i1 - i2; i3++) {
        cluster.push( [
          m * v0[0] + i1 * d1[0] + i2 * d2[0] + i3 * d3[0], // x
          m * v0[1] + i1 * d1[1] + i2 * d2[1] + i3 * d3[1], // y
          m * v0[2] + i1 * d1[2] + i2 * d2[2] + i3 * d3[2], // z
          t // type
        ]);
      }
    }
  }
}


// helper  function for sorting 3D points radially
function comparePoints(p1, p2) {
  // small number used as a value for numerical 'accuracy'
  const EPSILON = 1e-9;
  var rr1 = p1[0] * p1[0] + p1[1] * p1[1] + p1[2] * p1[2];
  var rr2 = p2[0] * p2[0] + p2[1] * p2[1] + p2[2] * p2[2];
  if (rr1 - rr2 > EPSILON){ return +2; }
  if (rr2 - rr1 > EPSILON){ return -2; }
  if (p1[0] - p2[0] > EPSILON){ return +1; }
  if (p2[0] - p1[0] > EPSILON){ return -1; }
  if (p1[1] - p2[1] > EPSILON){ return +1; }
  if (p2[1] - p1[1] > EPSILON){ return -1; }
  if (p1[2] - p2[2] > EPSILON){ return +1; }
  if (p2[2] - p1[2] > EPSILON){ return -1; }
  return 0;
}


// Callback if the window size changes
function onWindowResize() {
  var width = window.innerWidth;
  var height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize( width, height );
  composer.setSize( width, height );
}


function animate() {
  requestAnimationFrame( animate );
  controls.update();
  if( !clickedOnce ){ // Disable once user takes control
    mccInstancedMesh.rotation.x = Date.now() * 0.00022;
    mccInstancedMesh.rotation.y = Date.now() * 0.00013;
  }
  render();
}


function render() {
  composer.render();
}
