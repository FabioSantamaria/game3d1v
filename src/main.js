import './style.css'
import * as THREE from 'three'

const app = document.querySelector('#app')
app.innerHTML = `
  <div id="ui">
    <div class="title">Open World 3D</div>
    <div id="objective"></div>
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

const createGrassTexture = () => {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#4a8f54'
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 1200; i += 1) {
    const x = Math.random() * size
    const y = Math.random() * size
    const shade = 120 + Math.floor(Math.random() * 60)
    ctx.fillStyle = `rgb(${20 + shade}, ${80 + shade}, ${30 + shade})`
    ctx.fillRect(x, y, 2, 2)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(80, 80)
  return texture
}

const createRockTexture = () => {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#6f6f6f'
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 800; i += 1) {
    const x = Math.random() * size
    const y = Math.random() * size
    const shade = 70 + Math.floor(Math.random() * 80)
    ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`
    ctx.fillRect(x, y, 2, 2)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, 2)
  return texture
}

const createCharacterTexture = () => {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createLinearGradient(0, 0, size, size)
  gradient.addColorStop(0, '#3a6bff')
  gradient.addColorStop(1, '#00c2ff')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
  ctx.lineWidth = 6
  for (let i = 0; i < 6; i += 1) {
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, 10 + i * 10, 0, Math.PI * 2)
    ctx.stroke()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

const groundGeometry = new THREE.PlaneGeometry(1000, 1000, 1, 1)
const groundMaterial = new THREE.MeshStandardMaterial({ map: createGrassTexture() })
const ground = new THREE.Mesh(groundGeometry, groundMaterial)
ground.rotation.x = -Math.PI / 2
ground.position.y = 0
scene.add(ground)

const characterMaterial = new THREE.MeshStandardMaterial({
  map: createCharacterTexture(),
  roughness: 0.35,
  metalness: 0.1
})
const character = new THREE.Mesh(new THREE.CapsuleGeometry(0.6, 1.2, 4, 8), characterMaterial)
character.position.set(0, 1.8, 0)
scene.add(character)

const rocksGeometry = new THREE.DodecahedronGeometry(1, 0)
const rocksMaterial = new THREE.MeshStandardMaterial({
  map: createRockTexture(),
  roughness: 0.85
})
const rocksCount = 240
const rocks = new THREE.InstancedMesh(rocksGeometry, rocksMaterial, rocksCount)
const dummy = new THREE.Object3D()
const obstacles = []

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
  obstacles.push({ position: new THREE.Vector3(x, scale, z), radius: scale * 1.05 })
}
scene.add(rocks)

const createCollectibleTexture = () => {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(size * 0.4, size * 0.4, 10, size / 2, size / 2, size / 1.2)
  gradient.addColorStop(0, '#fff4b0')
  gradient.addColorStop(1, '#ff7b00')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

const collectibles = []
const totalCollectibles = 12
const collectibleMaterial = new THREE.MeshStandardMaterial({
  map: createCollectibleTexture(),
  emissive: new THREE.Color(0xffa000),
  emissiveIntensity: 0.7
})
const collectibleGeometry = new THREE.SphereGeometry(0.6, 24, 24)

for (let i = 0; i < totalCollectibles; i += 1) {
  const distance = 35 + Math.random() * 170
  const angle = Math.random() * Math.PI * 2
  const x = Math.cos(angle) * distance + (Math.random() - 0.5) * 12
  const z = Math.sin(angle) * distance + (Math.random() - 0.5) * 12
  const orb = new THREE.Mesh(collectibleGeometry, collectibleMaterial)
  orb.position.set(x, 1.1 + Math.random() * 2.2, z)
  orb.userData.spin = (Math.random() * 0.8 + 0.4) * (Math.random() > 0.5 ? 1 : -1)
  scene.add(orb)
  collectibles.push(orb)
}

const objective = document.querySelector('#objective')
let collected = 0
const updateObjectiveText = () => {
  if (collected >= totalCollectibles) {
    objective.textContent = 'Objective complete · Return to the center'
    return
  }
  objective.textContent = `Objective · Collect ${totalCollectibles} energy orbs (${collected}/${totalCollectibles})`
}
updateObjectiveText()

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

const worldRadius = 240
const characterRadius = 0.8
const groundHeight = 1.8

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

  if (character.position.y <= groundHeight) {
    character.position.y = groundHeight
    velocityY = 0
    grounded = true
  }

  for (const obstacle of obstacles) {
    const offset = character.position.clone().sub(obstacle.position)
    offset.y = 0
    const distance = offset.length()
    const minDistance = characterRadius + obstacle.radius
    if (distance > 0 && distance < minDistance) {
      offset.normalize().multiplyScalar(minDistance - distance)
      character.position.add(offset)
    }
  }

  const planar = new THREE.Vector2(character.position.x, character.position.z)
  if (planar.length() > worldRadius) {
    planar.setLength(worldRadius)
    character.position.x = planar.x
    character.position.z = planar.y
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

  for (const orb of collectibles) {
    if (!orb.visible) continue
    orb.rotation.y += delta * orb.userData.spin
    orb.position.y += Math.sin(clock.elapsedTime * 2 + orb.position.x) * delta * 0.6
    const distance = orb.position.distanceTo(character.position)
    if (distance < 1.6) {
      orb.visible = false
      collected += 1
      updateObjectiveText()
    }
  }

  renderer.render(scene, camera)
  requestAnimationFrame(animate)
}

animate()

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
})
