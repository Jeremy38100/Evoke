import Peer, { DataConnection } from 'peerjs';
import { useFormik } from 'formik';
import { useEffect, useRef, useState } from 'react';
import ImagesGrid, { ChoseImageOpts, ImagesGridProps } from './ImagesGrid';
import { NoTeamPlayers, TeamPlayers, TeamPlayersProps } from './Team';
import { COLORS, getImages } from './imagesUtils';
import { Game, GameStatus, ImageCard, Player, Team, TeamId } from './model';

enum MESSAGES {
  HELLO = 'HELLO',
  UPDATE_PLAYER = 'UPDATE_PLAYER',
  UPDATE_GAME = 'UPDATE_GAME',
  GET_PLAYER = 'GET_PLAYER',
  CHOSE_IMAGE = 'CHOSE_IMAGE',
  OK_NEXT_TEAM = 'OK_NEXT_TEAM',
  HINT_IMAGE = 'HINT_IMAGE',
}

export interface DataReceived {
  message: MESSAGES,
  data: any
}

const App = () => {
  const nameForm = useFormik({
    initialValues: { name: '' },
    onSubmit: ({ name }) => { name && startPeer() }
  });

  const [peer, setPeer] = useState<Peer>()
  const [clientConnectionsMap, setClientConnectionsMap] = useState<Record<string, DataConnection>>({}) // Keep track of clients
  const hostConnectionRef = useRef<DataConnection>() // undefined if host, set if client
  const [isHostConnection, setIsHostConnection] = useState(false) // TODO: edit this and call .on callbacks in a useEffect Hook

  const [joinRoomInput, setJoinRoomInput] = useState('')
  const [gameData, setGameData] = useState<Game>({
    gameId: '',
    teams: [],
    players: {},
    gameStatus: GameStatus.WAITING_TO_START,
    teamPlaying: '',
    images: [],
    winner: ''
  });

  const onHostConnectionLost = () => {
    const result = window.confirm("Connection lost, reload page?");
    if (result) location.reload()
    hostConnectionRef.current = undefined
    setIsHostConnection(false)
  }

  useEffect(() => {
    Object.values(clientConnectionsMap).forEach(conn => {
      console.log('update game for', conn.peer);
      conn.send({
        message: MESSAGES.UPDATE_GAME,
        data: gameData
      })
    })
  }, [clientConnectionsMap, gameData])

  const getMyPlayer = () => Object.values(gameData.players).find(p => p.id === peer?.id)
  const AmIHostFromRef = () => !hostConnectionRef.current

  const getInitMyPlayer = (id?: string): Player => ({
    id: id ?? peer!.id,
    isGameMaster: false,
    name: nameForm.values.name,
    teamId: ''
  })

  const removePlayer = (id: string) => {
    setGameData(prevGame => {
      const newGame = structuredClone(prevGame)
      delete newGame.players[id]
      return newGame
    })
  }

  const onMessageReceived = (({ message, data }: DataReceived) => {
    if (message == MESSAGES.UPDATE_PLAYER)
      updatePlayer(data as Player)
    else if (message == MESSAGES.UPDATE_GAME)
      setGameData(() => ({ ...data }))
    else if (message == MESSAGES.GET_PLAYER)
      updatePlayer(getInitMyPlayer())
    else if (message == MESSAGES.CHOSE_IMAGE)
      choseImage(data)
    else if (message == MESSAGES.OK_NEXT_TEAM)
      OkNextTeam()
    else if (message == MESSAGES.HINT_IMAGE)
      hintCard(data.image)
    else
      console.log('unknown', message, data);
  })

  const sendMessage = (message: MESSAGES, data: any) => {
    console.log('send', message, data)
    if (!hostConnectionRef.current) {
      console.error('No host')
      return
    }
    hostConnectionRef.current.send({ message, data })
  }

  const disconnectConnAndPlayer = (id: string) => {
    setClientConnectionsMap(prev => {
      const newConnectionsMap = structuredClone(prev)
      delete newConnectionsMap[id]
      return newConnectionsMap
    })
    removePlayer(id)
  }

  const getOtherTeam = (team: TeamId): TeamId => {
    if (team == 'teamBlue') return 'teamRed'
    return 'teamBlue'
  }

  // ------------------------------------------ //
  // ------------- GAME ACTIONS --------------- //

  const updatePlayer = (player: Player) => {
    if (AmIHostFromRef()) {
      setGameData(prevGame => {
        const newGame = structuredClone(prevGame)
        newGame.players[player.id] = player
        return newGame
      })
      return
    }
    sendMessage(MESSAGES.UPDATE_PLAYER, player)

  };

  const choseImage = ({ image, player }: ChoseImageOpts) => {
    console.log('chose image', image, player);

    if (AmIHostFromRef()) {
      setGameData(prevGame => {
        const newGame = structuredClone(prevGame)
        const playerTeamId = player.teamId
        const playerTeam: Team = newGame.teams.find(t => t.teamId == playerTeamId)!
        const otherTeam = getOtherTeam(playerTeamId)
        console.log({ playerTeam: playerTeamId, otherTeam });

        const imageFromGame = newGame.images.find(i => i.imageId == image.imageId)!
        if (!imageFromGame) alert('💣 RUN')

        imageFromGame.flippedByTeam = playerTeamId
        imageFromGame.isHint = false
        const imageTeam = imageFromGame!.imageTeam

        if (imageTeam == 'dead') {
          // Flipped dead card
          console.log('dead');
          newGame.gameStatus = GameStatus.ENDED
          newGame.images.forEach(image => image.isHint = false)
          newGame.winner = otherTeam
        } else {
          console.log('removing one try to team', playerTeamId);

          playerTeam.nbTryLeft -= 1
          if (imageTeam !== playerTeamId) {
            console.log('not you team');
            newGame.images.forEach(image => image.isHint = false)
            newGame.teamPlaying = getOtherTeam(playerTeamId)
          }
          const remainingImageForPlayerTeam = newGame.images.find(({ imageTeam, flippedByTeam }) => imageTeam == playerTeamId && !flippedByTeam)
          const remainingImageForOtherTeam = newGame.images.find(({ imageTeam, flippedByTeam }) => imageTeam == otherTeam && !flippedByTeam)
          if (!remainingImageForPlayerTeam) {
            console.log(playerTeamId, 'win');
            newGame.gameStatus = GameStatus.ENDED
            newGame.images.forEach(image => image.isHint = false)
            newGame.winner = playerTeamId
          } else if (!remainingImageForOtherTeam || playerTeam.nbTryLeft == 0) {
            console.log(otherTeam, 'win')
            newGame.gameStatus = GameStatus.ENDED
            newGame.images.forEach(image => image.isHint = false)
            newGame.winner = otherTeam
          }
        }
        console.log(newGame);

        return newGame
      })
      return
    }
    sendMessage(MESSAGES.CHOSE_IMAGE, { image, player })
  }

  const hintCard = (image: ImageCard) => {
    if (AmIHostFromRef()) {
      setGameData(prevGame => {
        const newGame = structuredClone(prevGame)
        const imageFromGame: ImageCard = newGame.images.find(i => i.imageId == image.imageId)!
        imageFromGame.isHint = !imageFromGame.isHint
        return newGame
      })
      return
    }
    sendMessage(MESSAGES.HINT_IMAGE, { image })
  }

  const OkNextTeam = () => {
    if (AmIHostFromRef()) {
      setGameData(prevGame => {
        const newGame = structuredClone(prevGame)
        newGame.images.forEach(image => image.isHint = false)
        newGame.teamPlaying = getOtherTeam(newGame.teamPlaying)
        return newGame
      })
      return
    }
    sendMessage(MESSAGES.OK_NEXT_TEAM, {})
  }

  const restartGame = () => {
    setGameData(prevGame => {
      const newGame = structuredClone(prevGame)
      newGame.teams = [],
        newGame.gameStatus = GameStatus.WAITING_TO_START,
        newGame.teamPlaying = '',
        newGame.images = [],
        newGame.winner = ''
      return newGame
    })

  }

  const start = () => {
    setGameData(prev => ({
      ...prev,
      images: getImages({
        nbBlue: 7,
        nbRed: 6,
        nbNeutral: 2,
        nbDead: 1

      }), // TODO,
      teamPlaying: 'teamBlue',
      teams: [
        { teamId: 'teamBlue', nbTryLeft: 5 },
        { teamId: 'teamRed', nbTryLeft: 6 },
      ],
      gameStatus: GameStatus.RUNNING,
    }))

  }


  // ------------- GAME ACTIONS --------------- //
  // ------------------------------------------ //


  const startPeer = () => {
    const myPeer = new Peer();

    myPeer.on('open', id => {
      console.log('on open', id);
      setPeer(myPeer);
      setGameData(prev => ({
        ...prev,
        gameId: myPeer.id
      }))
      updatePlayer(getInitMyPlayer(myPeer.id))
    });

    // host code when client connect
    myPeer.on('connection', conn => {
      console.log('myPeer on connection', conn);

      conn.on('data', (data) => {
        // Received message from client
        onMessageReceived(data as DataReceived)
      });

      conn.on('close', () => {
        // Player disconnected
        console.log('on close', conn.peer);
        disconnectConnAndPlayer(conn.peer)
      })

      conn.on('error', data => {
        console.log('on error', conn.peer);
        // Can not send message (eg player shut down the tab)
        console.log('myPeer onConnection error', data);
        // disconnectConnAndPlayer(conn.peer)
      })

      conn.on('open', () => {
        console.log('myPeer onConnection open');
        setClientConnectionsMap(prev => {
          return {
            ...prev,
            [conn.peer]: conn
          }
        })
        conn.send({ message: MESSAGES.GET_PLAYER })
      })
    });

    myPeer.on('disconnected', id => {
      console.log('myPeer on disconnected', id);

    })
  }

  // Client code
  const joinRoom = () => {
    if (!joinRoomInput) return
    const conn = peer!.connect(joinRoomInput);

    conn.on('open', () => {
      // Joined host
      console.log('Joined host');
      hostConnectionRef.current = conn
      setIsHostConnection(true)
      sendMessage(MESSAGES.HELLO, {})
    });

    conn.on('data', (data) => {
      console.log('received data from host', data);
      onMessageReceived(data as DataReceived)
    });

    conn.on('close', () => {
      console.log('Lost connection from host');
      onHostConnectionLost()
    })

    conn.on('error', err => {
      console.log('conn on error', err);
      onHostConnectionLost()
    })

  };

  const getTeamProps = (teamId: TeamId): TeamPlayersProps => ({
    gameData,
    teamId,
    myPlayer: getMyPlayer()!,
    joinTeam: (teamId, isGameMaster) => updatePlayer({
      ...getMyPlayer()!,
      teamId,
      isGameMaster
    })
  })

  const getImagesGridPros = (): ImagesGridProps => ({
    gameData,
    myPlayer: getMyPlayer()!,
    choseImage,
    hintCard
  })

  const colorToPlay = () => gameData.teamPlaying === 'teamBlue' ? COLORS.BLUE : COLORS.RED
  const getTeam = (teamId: TeamId): Team => gameData.teams.find(t => t.teamId == teamId)!
  const getRemainingCardsTeam = (teamId: TeamId): number =>
    gameData.images.filter(i => i.imageTeam == teamId && !i.flippedByTeam).length

  return (
    <div style={{ marginBottom: 20 }}>
      {!peer ? <div>
        <form onSubmit={nameForm.handleSubmit}>
          <label>Pseudo</label>
          <input name="name"
            onChange={nameForm.handleChange}
            value={nameForm.values.name}
          />
          <button type="submit">OK</button>
        </form>
      </div> :
        <p>Name: {nameForm.values.name}</p>
      }

      {peer && <div >
        {
          isHostConnection || Object.keys(clientConnectionsMap).length > 0 ? (
            <p>🔗 Current room id : {gameData.gameId}</p>
          ) : (
            <div>
              <p>🔗 Current room id : {peer?.id}</p>
              <label>➡️ Join room (empty to host):</label>
              <input value={joinRoomInput} onChange={e => setJoinRoomInput(e.target.value)}></input>
              <button disabled={!joinRoomInput} onClick={joinRoom}>OK</button>
            </div>
          )
        }

        {/* <div>
          <p>Connections:</p>
          {Object.keys(connectionsMap).map(e => <p key={e}>{e}</p>)}
        </div> */}

        {getMyPlayer() && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-around'
            }}>
              <div style={{ border: `6px solid ${COLORS.BLUE}`, borderRadius: 6 }}>
                <TeamPlayers {...getTeamProps('teamBlue')} />
              </div>
              <NoTeamPlayers {...getTeamProps('')} />
              <div style={{ border: `6px solid ${COLORS.RED}`, borderRadius: 6 }}>
                <TeamPlayers {...getTeamProps('teamRed')} />
              </div>
            </div>

            {!isHostConnection && gameData.gameStatus == GameStatus.WAITING_TO_START && <button onClick={start}>START</button>}
            {
              gameData.gameStatus !== GameStatus.WAITING_TO_START && <>
                <div className='flex-container-center'>
                  <p style={{ borderRadius: 6, padding: 10, background: COLORS.BLUE, border: `4px solid ${COLORS.BLUE}` }}>
                    🔵 Blue team cards : {getRemainingCardsTeam('teamBlue')} ({getTeam('teamBlue').nbTryLeft} try left)
                  </p>
                  {gameData.gameStatus == GameStatus.RUNNING ?
                    <p style={{ borderRadius: 6, padding: 10, border: `4px solid ${colorToPlay()}` }}>{gameData.teamPlaying === 'teamBlue' ? 'Blue' : 'Read'} team to play</p>
                    :
                    <p style={{ borderRadius: 6, padding: 10 }}>{gameData.winner === 'teamBlue' ? 'Blue' : 'Read'} team WINNER</p>
                  }
                  <p style={{ borderRadius: 6, padding: 10, background: COLORS.RED, border: `4px solid ${COLORS.RED}` }}>
                    🔴 Red team cards : {getRemainingCardsTeam('teamRed')} ({getTeam('teamRed').nbTryLeft} try left)
                  </p>
                </div>
                <div className='flex-container-center'>
                  <ImagesGrid  {...getImagesGridPros()} />
                </div>
                {gameData.teamPlaying == getMyPlayer()?.teamId && !getMyPlayer()?.isGameMaster && gameData.gameStatus == GameStatus?.RUNNING &&
                  <button onClick={() => OkNextTeam()}>OK NEXT TEAM</button>
                }
              </>
            }
            {gameData.gameStatus == GameStatus.ENDED && !isHostConnection &&
              <button onClick={restartGame}>RESTART</button>}
          </div>
        )}

      </div>}
    </div >
  );
};

export default App;

