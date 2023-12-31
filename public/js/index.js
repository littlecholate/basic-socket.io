const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

const socket = io() // create a connection to the backend when calling io()

const scoreEl = document.querySelector('#scoreEl')

const devicePixelRatio = window.devicePixelRatio || 1

canvas.width = innerWidth * devicePixelRatio
canvas.height = innerHeight * devicePixelRatio

const x = canvas.width / 2
const y = canvas.height / 2

const frontendPlayers = {}

// listen to the broadcast topic
socket.on('updatePlayers', (backendPlayers) => {
  // add any player if connect
  for (const id in backendPlayers) {
    const backendPlayer = backendPlayers[id]

    if (!frontendPlayers[id]) {
      frontendPlayers[id] = new Player({
        x: backendPlayer.x,
        y: backendPlayer.y,
        radius: 10,
        color: backendPlayer.color
      })
    } else {
      if (id === socket.id) {
        // if a player already exists
        frontendPlayers[id].x = backendPlayer.x
        frontendPlayers[id].y = backendPlayer.y
        // backend reconciliation
        const lastBackendInputIndex = playerInputs.findIndex((input) => {
          return backendPlayer.sequenceNumber === input.sequenceNumber
        })
        if (lastBackendInputIndex > -1)
          playerInputs.splice(0, lastBackendInputIndex + 1)

        playerInputs.forEach((input) => {
          frontendPlayers[id].x += input.dx
          frontendPlayers[id].y += input.dy
        })
      } else {
        // for all other players with player interpolation
        gsap.to(frontendPlayers[id], {
          x: backendPlayer.x,
          y: backendPlayer.y,
          duration: 0.015,
          ease: 'linear'
        })
      }
    }
  }

  // check if any player disconnect
  for (const id in frontendPlayers) {
    if (!backendPlayers[id]) {
      delete frontendPlayers[id]
    }
  }
})

let animationId
function animate() {
  animationId = requestAnimationFrame(animate)
  c.fillStyle = 'rgba(0, 0, 0, 0.1)'
  c.fillRect(0, 0, canvas.width, canvas.height)

  for (const id in frontendPlayers) {
    const player = frontendPlayers[id]
    player.draw()
  }
}

animate()

const keys = {
  w: {
    pressed: false
  },
  a: {
    pressed: false
  },
  s: {
    pressed: false
  },
  d: {
    pressed: false
  }
}
const SPEED = 10
const playerInputs = []
let sequenceNumber = 0 // backend reconciliation
// client side prediction and send states to the backend
setInterval(() => {
  if (keys.w.pressed) {
    sequenceNumber++
    playerInputs.push({ sequenceNumber, dx: 0, dy: -SPEED })
    frontendPlayers[socket.id].y -= SPEED
    socket.emit('keydown', { keycode: 'KeyW', sequenceNumber })
  }
  if (keys.a.pressed) {
    sequenceNumber++
    playerInputs.push({ sequenceNumber, dx: -SPEED, dy: 0 })
    frontendPlayers[socket.id].x -= SPEED
    socket.emit('keydown', { keycode: 'KeyA', sequenceNumber })
  }
  if (keys.s.pressed) {
    sequenceNumber++
    playerInputs.push({ sequenceNumber, dx: 0, dy: SPEED })
    frontendPlayers[socket.id].y += SPEED
    socket.emit('keydown', { keycode: 'KeyS', sequenceNumber })
  }
  if (keys.d.pressed) {
    sequenceNumber++
    playerInputs.push({ sequenceNumber, dx: SPEED, dy: 0 })
    frontendPlayers[socket.id].x += SPEED
    socket.emit('keydown', { keycode: 'KeyD', sequenceNumber })
  }
}, 15)

window.addEventListener('keydown', (event) => {
  if (!frontendPlayers[socket.id]) return
  switch (event.code) {
    case 'KeyW':
      keys.w.pressed = true
      break
    case 'KeyA':
      keys.a.pressed = true
      break
    case 'KeyS':
      keys.s.pressed = true
      break
    case 'KeyD':
      keys.d.pressed = true
      break
  }
})

window.addEventListener('keyup', (event) => {
  if (!frontendPlayers[socket.id]) return
  switch (event.code) {
    case 'KeyW':
      keys.w.pressed = false
      break
    case 'KeyA':
      keys.a.pressed = false
      break
    case 'KeyS':
      keys.s.pressed = false
      break
    case 'KeyD':
      keys.d.pressed = false
      break
  }
})
