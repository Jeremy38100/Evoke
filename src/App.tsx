import { useFormik } from 'formik';
import { useEffect } from 'react';
import ImagesGrid from './components/ImagesGrid';
import { NoTeamPlayers, TeamPlayers } from './components/Team';
import { useGameContext } from './context/GameContext';
import { usePeerJSContext } from './context/PeerJSContext';
import { GameStatus, Team, TeamId } from './models/model';
import { COLORS } from './utils/images.utils';
import { randomString } from './utils/utils';
import { useToast } from './context/ToastContext';

const App = () => {

  const { showToast } = useToast()
  const { peerId, initPeerSocket, isAClientOrHost, amIHost } = usePeerJSContext()
  const { game, getMyPlayer, OkNextTeam, start, setInWaitingBeforeStart, joinRoom, setMyPlayerName } = useGameContext()

  const colorToPlay = () => game.teamPlaying === 'teamBlue' ? COLORS.BLUE : COLORS.RED
  const getTeam = (teamId: TeamId): Team => game.teams.find(t => t.teamId === teamId)!
  const getRemainingCardsTeam = (teamId: TeamId): number =>
    game.images.filter(i => i.imageTeam === teamId && !i.flippedByTeam).length

  const nameForm = useFormik({
    initialValues: { name: '' },
    onSubmit: ({ name }) => {
      setMyPlayerName(name)
      initPeerSocket()
    }
  });

  const roomIdForm = useFormik({
    initialValues: { roomId: '' },
    onSubmit: ({ roomId }) => {
      joinRoom(roomId)
    }
  });

  // DEV - Set random name
  // useEffect(() => {
  //   nameForm.setFieldValue('name', randomString())
  //   nameForm.handleSubmit()
  // }, [])

  const copyGameId = () => {
    navigator.clipboard.writeText(game.gameId);
    showToast('Room ID copied to clipboard!')
  }

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        {!peerId ? <div>
          <form onSubmit={nameForm.handleSubmit}>
            <label>Pseudo</label>
            <input name="name"
              id='input-name'
              onChange={nameForm.handleChange}
              value={nameForm.values.name}
            />
            <button id='button-name' type="submit">OK</button>
          </form>
        </div> :
          <p>Pseudo: <span id=''>{nameForm.values.name}</span></p>
        }

        {peerId && <div >
          <p>🎲 Current room id : <span id='roomId'>{game.gameId}</span>
            <button onClick={copyGameId}>🔗</button>
          </p>
          {
            !isAClientOrHost() &&
            <form onSubmit={roomIdForm.handleSubmit}>
              <label>➡️ Join room (empty to host):</label>
              <input name="roomId"
                id='input-room'
                onChange={roomIdForm.handleChange}
                value={roomIdForm.values.roomId}
              />
              <button id='button-room' type="submit">OK</button>
            </form>
            // <div>
            //   <label>➡️ Join room (empty to host):</label>
            //   <input id='input-room' value={joinRoomInput} onChange={e => setJoinRoomInput(e.target.value)}></input>
            //   <button id='button-room' disabled={!joinRoomInput} onClick={() => joinRoom(joinRoomInput)}>OK</button>
            // </div>
          }

          {getMyPlayer() && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-around'
              }}>
                <div style={{ border: `6px solid ${COLORS.BLUE}`, borderRadius: 6 }}>
                  <TeamPlayers teamId='teamBlue' />
                </div>
                <NoTeamPlayers />
                <div style={{ border: `6px solid ${COLORS.RED}`, borderRadius: 6 }}>
                  <TeamPlayers teamId='teamRed' />
                </div>
              </div>

              {amIHost() && game.gameStatus === GameStatus.WAITING_TO_START && <button onClick={start}>START</button>}
              {
                game.gameStatus !== GameStatus.WAITING_TO_START && <>
                  <div className='flex-container-center'>
                    <p style={{ borderRadius: 6, padding: 10, background: COLORS.BLUE, border: `4px solid ${COLORS.BLUE}` }}>
                      🔵 Blue team cards : {getRemainingCardsTeam('teamBlue')} ({getTeam('teamBlue').nbTryLeft} try left)
                    </p>
                    {game.gameStatus === GameStatus.RUNNING ?
                      <p style={{ borderRadius: 6, padding: 10, border: `4px solid ${colorToPlay()}` }}>{game.teamPlaying === 'teamBlue' ? 'Blue' : 'Read'} team to play</p>
                      :
                      <p style={{ borderRadius: 6, padding: 10 }}>{game.winner === 'teamBlue' ? 'Blue' : 'Read'} team WINNER</p>
                    }
                    <p style={{ borderRadius: 6, padding: 10, background: COLORS.RED, border: `4px solid ${COLORS.RED}` }}>
                      🔴 Red team cards : {getRemainingCardsTeam('teamRed')} ({getTeam('teamRed').nbTryLeft} try left)
                    </p>
                  </div>
                  <div className='flex-container-center'>
                    <ImagesGrid />
                  </div>
                  {game.teamPlaying === getMyPlayer()?.teamId && !getMyPlayer()?.isGameMaster && game.gameStatus === GameStatus?.RUNNING &&
                    <button onClick={() => OkNextTeam()}>OK NEXT TEAM</button>
                  }
                </>
              }
              {game.gameStatus === GameStatus.ENDED && amIHost() &&
                <button onClick={setInWaitingBeforeStart}>RESTART</button>}
            </div>
          )}

        </div>}
      </div >
    </>
  );
};

export default App;

