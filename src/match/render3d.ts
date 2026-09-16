import * as THREE from 'three'
import { PITCH, type MatchState } from './types'

export interface Quality3D {
  shadows: boolean
  shadowMapSize: number
  pixelRatioCap: number
  antialias: boolean
  crowd: boolean
}

export const QUALITY_TIERS_3D: Quality3D[] = [
  { shadows: false, shadowMapSize: 512, pixelRatioCap: 1, antialias: false, crowd: false },
  { shadows: false, shadowMapSize: 512, pixelRatioCap: 1.25, antialias: false, crowd: true },
  { shadows: true, shadowMapSize: 1024, pixelRatioCap: 1.75, antialias: true, crowd: true },
  { shadows: true, shadowMapSize: 2048, pixelRatioCap: 2.5, antialias: true, crowd: true },
]

interface PlayerParts {
  torso: THREE.Group
  legL: THREE.Group
  legR: THREE.Group
  armL: THREE.Group
  armR: THREE.Group
  ring: THREE.Mesh
  card: THREE.Mesh
}

const TORSO_BASE_Y = 1.05
const HOME_COLOR = 0x2dd6f0
const AWAY_COLOR = 0xef4444
const GK_HOME_COLOR = 0xffd980
const GK_AWAY_COLOR = 0xfb923c

function toWorld(x: number, y: number) {
  return { x: x - PITCH.width / 2, z: y - PITCH.length / 2 }
}

function createPitchTexture(): THREE.CanvasTexture {
  const w = 512
  const h = Math.round((w * PITCH.length) / PITCH.width)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const s = w / PITCH.width

  ctx.fillStyle = '#0e3a20'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = 'rgba(255,255,255,0.035)'
  const stripe = 10 * s
  for (let y = 0, i = 0; y < h; y += stripe, i++) {
    if (i % 2 === 0) ctx.fillRect(0, y, w, stripe)
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.lineWidth = Math.max(1, 0.35 * s)
  ctx.strokeRect(1, 1, w - 2, h - 2)
  ctx.beginPath()
  ctx.moveTo(1, h / 2)
  ctx.lineTo(w - 1, h / 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(w / 2, h / 2, 9 * s, 0, Math.PI * 2)
  ctx.stroke()

  const boxX = (PITCH.width / 2 - PITCH.boxWidth / 2) * s
  const boxW = PITCH.boxWidth * s
  ctx.strokeRect(boxX, 1, boxW, PITCH.boxDepth * s)
  ctx.strokeRect(boxX, h - 1 - PITCH.boxDepth * s, boxW, PITCH.boxDepth * s)

  const sixX = (PITCH.width / 2 - PITCH.sixWidth / 2) * s
  const sixW = PITCH.sixWidth * s
  ctx.strokeRect(sixX, 1, sixW, PITCH.sixDepth * s)
  ctx.strokeRect(sixX, h - 1 - PITCH.sixDepth * s, sixW, PITCH.sixDepth * s)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function createBallTexture(): THREE.CanvasTexture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#f4f6fb'
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = '#1a2138'
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      if ((x + y) % 2 === 0) ctx.fillRect(x * (size / 4), y * (size / 4), size / 4, size / 4)
    }
  }
  return new THREE.CanvasTexture(canvas)
}

function createStandTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 16
  const ctx = canvas.getContext('2d')!
  const colors = ['#1c2542', '#202a47', '#182036', '#232d4f']
  for (let x = 0; x < 64; x += 2) {
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)]
    ctx.fillRect(x, 0, 2, 16)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(8, 1)
  return tex
}

function buildLimb(color: number, radius: number, length: number): THREE.Mesh {
  const geo = new THREE.CapsuleGeometry(radius, length, 3, 6)
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.y = -length / 2 - radius
  mesh.castShadow = true
  return mesh
}

function buildPlayerMesh(team: 'home' | 'away', isGK: boolean): THREE.Group {
  const group = new THREE.Group()
  const color = isGK ? (team === 'home' ? GK_HOME_COLOR : GK_AWAY_COLOR) : team === 'home' ? HOME_COLOR : AWAY_COLOR
  const skin = 0xf1c27d

  const torso = new THREE.Group()
  torso.name = 'torso'
  torso.position.y = TORSO_BASE_Y
  group.add(torso)

  const bodyGeo = new THREE.CapsuleGeometry(0.4, 0.55, 4, 8)
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05 })
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  body.castShadow = true
  torso.add(body)

  const headGeo = new THREE.SphereGeometry(0.3, 10, 10)
  const headMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.8 })
  const head = new THREE.Mesh(headGeo, headMat)
  head.position.y = 0.75
  head.castShadow = true
  torso.add(head)

  const legL = new THREE.Group()
  legL.name = 'legL'
  legL.position.set(-0.16, 0.7, 0)
  legL.add(buildLimb(0x1c2542, 0.13, 0.7))
  group.add(legL)

  const legR = new THREE.Group()
  legR.name = 'legR'
  legR.position.set(0.16, 0.7, 0)
  legR.add(buildLimb(0x1c2542, 0.13, 0.7))
  group.add(legR)

  const armL = new THREE.Group()
  armL.name = 'armL'
  armL.position.set(-0.48, 0.55, 0)
  armL.add(buildLimb(color, 0.1, 0.5))
  torso.add(armL)

  const armR = new THREE.Group()
  armR.name = 'armR'
  armR.position.set(0.48, 0.55, 0)
  armR.add(buildLimb(color, 0.1, 0.5))
  torso.add(armR)

  const ringGeo = new THREE.RingGeometry(0.55, 0.72, 20)
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.03
  ring.name = 'controlRing'
  group.add(ring)

  const cardGeo = new THREE.PlaneGeometry(0.32, 0.45)
  const cardMat = new THREE.MeshBasicMaterial({ color: 0xffd400, transparent: true, opacity: 0, side: THREE.DoubleSide })
  const card = new THREE.Mesh(cardGeo, cardMat)
  card.position.set(0.5, 1.5, 0)
  card.name = 'card'
  group.add(card)

  group.userData.phase = Math.random() * Math.PI * 2
  group.userData.parts = { torso, legL, legR, armL, armR, ring, card }
  return group
}

function buildGoal(x: number, z: number, facing: 1 | -1): THREE.Group {
  const group = new THREE.Group()
  const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
  const postGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.44, 8)
  const height = 2.44
  const width = PITCH.goalWidth

  const left = new THREE.Mesh(postGeo, postMat)
  left.position.set(x - width / 2, height / 2, z)
  left.castShadow = true
  group.add(left)

  const right = new THREE.Mesh(postGeo, postMat)
  right.position.set(x + width / 2, height / 2, z)
  right.castShadow = true
  group.add(right)

  const crossGeo = new THREE.CylinderGeometry(0.1, 0.1, width, 8)
  const cross = new THREE.Mesh(crossGeo, postMat)
  cross.rotation.z = Math.PI / 2
  cross.position.set(x, height, z)
  group.add(cross)

  const netMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, side: THREE.DoubleSide })
  const netGeo = new THREE.PlaneGeometry(width, height)
  const net = new THREE.Mesh(netGeo, netMat)
  net.position.set(x, height / 2, z + facing * 0.4)
  group.add(net)

  return group
}

export class MatchRenderer3D {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private playerMeshes = new Map<string, THREE.Group>()
  private ballMesh: THREE.Mesh
  private crowdGroup: THREE.Group
  private sun: THREE.DirectionalLight
  private camTarget = { x: 0, z: 0 }

  constructor(canvas: HTMLCanvasElement, quality: Quality3D) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: quality.antialias })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.pixelRatioCap))
    this.renderer.shadowMap.enabled = quality.shadows
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.camera = new THREE.PerspectiveCamera(50, 1.6, 1, 400)

    this.scene.background = new THREE.Color(0x081b10)
    this.scene.fog = new THREE.Fog(0x081b10, 90, 230)

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(PITCH.width, PITCH.length),
      new THREE.MeshStandardMaterial({ map: createPitchTexture(), roughness: 0.95 }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)

    const ambient = new THREE.AmbientLight(0xffffff, 0.55)
    this.scene.add(ambient)
    this.sun = new THREE.DirectionalLight(0xfff4e0, 1.1)
    this.sun.position.set(40, 70, 30)
    this.sun.castShadow = quality.shadows
    this.sun.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize)
    this.sun.shadow.camera.left = -60
    this.sun.shadow.camera.right = 60
    this.sun.shadow.camera.top = 90
    this.sun.shadow.camera.bottom = -90
    this.sun.shadow.camera.far = 160
    this.scene.add(this.sun)

    this.scene.add(buildGoal(0, -PITCH.length / 2, 1))
    this.scene.add(buildGoal(0, PITCH.length / 2, -1))

    this.crowdGroup = this.buildCrowd()
    this.crowdGroup.visible = quality.crowd
    this.scene.add(this.crowdGroup)

    this.ballMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 16, 16),
      new THREE.MeshStandardMaterial({ map: createBallTexture(), roughness: 0.5 }),
    )
    this.ballMesh.castShadow = true
    this.scene.add(this.ballMesh)
  }

  private buildCrowd(): THREE.Group {
    const group = new THREE.Group()
    const tex = createStandTexture()
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 1 })
    const sideGeo = new THREE.BoxGeometry(PITCH.length + 20, 8, 4)
    const endGeo = new THREE.BoxGeometry(PITCH.width + 20, 8, 4)

    const left = new THREE.Mesh(sideGeo, mat)
    left.rotation.y = Math.PI / 2
    left.position.set(-PITCH.width / 2 - 8, 4, 0)
    group.add(left)

    const right = new THREE.Mesh(sideGeo, mat)
    right.rotation.y = Math.PI / 2
    right.position.set(PITCH.width / 2 + 8, 4, 0)
    group.add(right)

    const near = new THREE.Mesh(endGeo, mat)
    near.position.set(0, 4, -PITCH.length / 2 - 8)
    group.add(near)

    const far = new THREE.Mesh(endGeo, mat)
    far.position.set(0, 4, PITCH.length / 2 + 8)
    group.add(far)

    return group
  }

  setQuality(quality: Quality3D) {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.pixelRatioCap))
    this.renderer.shadowMap.enabled = quality.shadows
    this.sun.castShadow = quality.shadows
    this.crowdGroup.visible = quality.crowd
  }

  resize(width: number, height: number) {
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }

  private ensurePlayer(id: string, team: 'home' | 'away', isGK: boolean): THREE.Group {
    let mesh = this.playerMeshes.get(id)
    if (!mesh) {
      mesh = buildPlayerMesh(team, isGK)
      this.playerMeshes.set(id, mesh)
      this.scene.add(mesh)
    }
    return mesh
  }

  render(state: MatchState) {
    const activeIds = new Set<string>()
    const now = performance.now() / 1000

    for (const p of state.players) {
      if (p.sentOff) continue
      activeIds.add(p.id)
      const mesh = this.ensurePlayer(p.id, p.team, p.isGK)
      const w = toWorld(p.x, p.y)
      mesh.position.set(w.x, 0, w.z)

      const speed = Math.hypot(p.vx, p.vy)
      if (speed > 0.5) {
        const angle = Math.atan2(p.vx, p.vy)
        mesh.rotation.y = angle
      }

      const parts = mesh.userData.parts as PlayerParts
      const phase = mesh.userData.phase as number
      const intensity = Math.min(1, speed / 15)
      const runCycle = now * 9 + phase

      parts.torso.position.y = TORSO_BASE_Y + Math.abs(Math.sin(runCycle)) * 0.07 * intensity
      parts.torso.rotation.x = intensity * 0.16
      parts.legL.rotation.x = Math.sin(runCycle) * 0.9 * intensity
      parts.legR.rotation.x = Math.sin(runCycle + Math.PI) * 0.9 * intensity
      parts.armL.rotation.x = Math.sin(runCycle + Math.PI) * 0.55 * intensity
      parts.armR.rotation.x = Math.sin(runCycle) * 0.55 * intensity

      const ring = parts.ring
      if (ring) (ring.material as THREE.MeshBasicMaterial).opacity = p.id === state.userControlledId ? 0.85 : 0

      const card = parts.card
      if (card) {
        const mat = card.material as THREE.MeshBasicMaterial
        if (p.yellow >= 2) {
          mat.opacity = 0.9
          mat.color.setHex(0xef4444)
        } else if (p.yellow === 1) {
          mat.opacity = 0.9
          mat.color.setHex(0xffd400)
        } else {
          mat.opacity = 0
        }
      }
    }

    for (const [id, mesh] of this.playerMeshes) {
      if (!activeIds.has(id)) mesh.visible = false
      else mesh.visible = true
    }

    const bw = toWorld(state.ball.x, state.ball.y)
    const speed = Math.hypot(state.ball.vx, state.ball.vy)
    const bob = state.ball.ownerId ? 0.6 : 0.6 + Math.min(1.2, speed / 60) * Math.abs(Math.sin(performance.now() / 90))
    this.ballMesh.position.set(bw.x, bob, bw.z)

    const targetX = THREE.MathUtils.clamp(bw.x * 0.35, -14, 14)
    this.camTarget.x = THREE.MathUtils.lerp(this.camTarget.x, targetX, 0.05)
    this.camTarget.z = THREE.MathUtils.lerp(this.camTarget.z, bw.z, 0.05)

    const camDistance = 52
    const camHeight = 34
    this.camera.position.set(camDistance, camHeight, this.camTarget.z * 0.82)
    this.camera.lookAt(this.camTarget.x, 1, this.camTarget.z)

    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.playerMeshes.forEach((mesh) => {
      mesh.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose())
          else obj.material.dispose()
        }
      })
    })
    this.renderer.dispose()
  }
}
