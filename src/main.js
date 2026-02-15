import './style.css'
import * as THREE from 'three'

const app = document.querySelector('#app')
app.innerHTML = `
  <div id="ui">
    <div class="title">Open World 3D</div>
    <div class="hint">Click to lock mouse · WASD move · Space jump · Shift sprint</div>
  </div>
  <canvas id="game"></canvas>
`

const canvas = document.querySelector('#game')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x89c4ff)
scene.fog = new THREE.Fog(0x89c4ff, 40, 260)

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500)
camera.position.set(0, 6, 12)

const hemisphere = new THREE.HemisphereLight(0xffffff, 0x2f4f4f, 0.9)
scene.add(hemisphere)

const sun = new THREE.DirectionalLight(0xffffff, 1.1)
sun.position.set(20, 40, 20)
sun.castShadow = false
scene.add(sun)

const groundGeometry = new THREE.PlaneGeometry(1000, 1000, 1, 1)
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x4a8f54 })
const ground = new THREE.Mesh(groundGeometry, groundMaterial)
ground.rotation.x = -Math.PI / 2
ground.position.y = 0
scene.add(ground)

const characterMaterial = new THREE.MeshStandardMaterial({ color: 0x2b6fff })
const character = new THREE.Mesh(new THREE.CapsuleGeometry(0.6, 1.2, 4, 8), characterMaterial)
character.position.set(0, 1.8, 0)
scene.add(character)

const rocksGeometry = new THREE.DodecahedronGeometry(1, 0)
const rocksMaterial = new THREE.MeshStandardMaterial({ color: 0x7b7b7b })
const rocksCount = 240
const rocks = new THREE.InstancedMesh(rocksGeometry, rocksMaterial, rocksCount)
const dummy = new THREE.Object3D()

for (let i = 0; i < rocksCount; i += 1) {
  const distance = 60 + Math.random() * 340
  const angle = Math.random() * Math.PI * 2
  const scale = 0.6 + Math.random() * 3
  const x = Math.cos(angle) * distance + (Math.random() - 0.5) * 30
  const z = Math.sin(angle) * distance + (Math.random() - 0.5) * 30
  dummy.position.set(x, scale, z)
  dummy.scale.setScalar(scale)
  dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
  dummy.updateMatrix()
  rocks.setMatrixAt(i, dummy.matrix)
}
scene.add(rocks)

const keys = new Set()
let yaw = 0
let pitch = 0
let velocityY = 0
let grounded = true
let pointerLocked = false

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const updatePointerState = () => {
  pointerLocked = document.pointerLockElement === canvas
  app.classList.toggle('locked', pointerLocked)
}

canvas.addEventListener('click', () => {
  canvas.requestPointerLock()
})

document.addEventListener('pointerlockchange', updatePointerState)

document.addEventListener('mousemove', (event) => {
  if (!pointerLocked) return
  yaw -= event.movementX * 0.0022
  pitch -= event.movementY * 0.0022
  pitch = clamp(pitch, -0.9, 0.9)
})

document.addEventListener('keydown', (event) => {
  keys.add(event.code)
})

document.addEventListener('keyup', (event) => {
  keys.delete(event.code)
})

const clock = new THREE.Clock()

const updateMovement = (delta) => {
  const moveForward = keys.has('KeyW')
  const moveBackward = keys.has('KeyS')
  const moveLeft = keys.has('KeyA')
  const moveRight = keys.has('KeyD')
  const sprinting = keys.has('ShiftLeft') || keys.has('ShiftRight')

  const input = new THREE.Vector3(
    (moveRight ? 1 : 0) - (moveLeft ? 1 : 0),
    0,
    (moveForward ? 1 : 0) - (moveBackward ? 1 : 0)
  )

  if (input.lengthSq() > 0) {
    input.normalize()
  }

  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw))
  const right = new THREE.Vector3(forward.z, 0, -forward.x)
  const direction = new THREE.Vector3()
  direction.addScaledVector(forward, input.z)
  direction.addScaledVector(right, input.x)
  if (direction.lengthSq() > 0) {
    direction.normalize()
  }

  const speed = sprinting ? 10 : 6
  character.position.addScaledVector(direction, speed * delta)

  if (keys.has('Space') && grounded) {
    velocityY = 7.5
    grounded = false
  }

  velocityY -= 18 * delta
  character.position.y += velocityY * delta

  const groundHeight = 1.8
  if (character.position.y <= groundHeight) {
    character.position.y = groundHeight
    velocityY = 0
    grounded = true
  }

  if (direction.lengthSq() > 0.0001) {
    character.rotation.y = yaw
  }
}

const updateCamera = () => {
  const cameraDistance = 8
  const cameraHeight = 3.2
  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw))
  const cameraPosition = character.position
    .clone()
    .addScaledVector(forward, -cameraDistance)
    .add(new THREE.Vector3(0, cameraHeight, 0))
  camera.position.lerp(cameraPosition, 0.12)

  const lookDirection = new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    Math.cos(yaw) * Math.cos(pitch)
  )
  const lookTarget = character.position.clone().add(new THREE.Vector3(0, 1.2, 0)).add(lookDirection.multiplyScalar(10))
  camera.lookAt(lookTarget)
}

const animate = () => {
  const delta = Math.min(clock.getDelta(), 0.033)
  updateMovement(delta)
  updateCamera()
  renderer.render(scene, camera)
  requestAnimationFrame(animate)
}

animate()

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
})
