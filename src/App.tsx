import { useFormik } from 'formik';
import ImagesGrid from './components/ImagesGrid';
import { NoTeamPlayers, TeamPlayers } from './components/Team';
import { useGameContext } from './context/GameContext';
import { useToast } from './context/ToastContext';
import { Team, TeamId } from './models/model';
import { COLORS } from './utils/images.utils';

const App = () => {

  const { showToast } = useToast()
  const {
    game: { winner, gameStatus, images, teamPlaying, teams }, myPlayer, gameId,
    peerId,
    nextTeamToPlay, amIHost, isAClientOrHost, start, setInWaitingBeforeStart, joinRoom, setMyPlayerName
  } = useGameContext()

  const colorToPlay = () => teamPlaying === 'teamBlue' ? COLORS.BLUE : COLORS.RED
  const getTeam = (teamId: TeamId): Team => teams[teamId]
  const getRemainingCardsTeam = (teamId: TeamId): number =>
    Object.values(images).filter(i => i.imageTeam === teamId && !i.flippedByTeam).length

  const nameForm = useFormik({
    initialValues: { name: '' },
    onSubmit: ({ name }) => {
      setMyPlayerName(name)
    }
  });

  const roomIdForm = useFormik({
    initialValues: { roomId: '' },
    onSubmit: ({ roomId }) => {
      joinRoom(roomId)
    }
  });

  const copyGameId = () => {
    try {
      navigator.clipboard.writeText(gameId);
      showToast('Room ID copied to clipboard!')
    } catch (error) {
      showToast('You can not copy from the button in your browser, please select the text and copy it manually.')
    }
  }

  return (
    <>
      {!peerId ? <>
        {/* TODO: improve this with a fancy animation */}
        <p>Waiting for connection with server...</p>
      </> :
        <div style={{ marginBottom: 20 }}>
          {!myPlayer?.name ? <div>
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

          {myPlayer?.name && <div >
            <p>🎲 Current room id : <span id='roomId'>{gameId}</span>
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
            }

            {myPlayer && (
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

                {amIHost() && gameStatus === 'waiting' && <button onClick={start}>START</button>}
                {
                  gameStatus !== 'waiting' && <>
                    <div className='flex-container-center'>
                      <p style={{ borderRadius: 6, padding: 10, background: COLORS.BLUE, border: `4px solid ${COLORS.BLUE}` }}>
                        🔵 Blue team cards : {getRemainingCardsTeam('teamBlue')} ({getTeam('teamBlue').nbTryLeft} try left)
                      </p>
                      {gameStatus === 'playing' ?
                        <p style={{ borderRadius: 6, padding: 10, border: `4px solid ${colorToPlay()}` }}>{teamPlaying === 'teamBlue' ? 'Blue' : 'Read'} team to play</p>
                        :
                        <p style={{ borderRadius: 6, padding: 10 }}>{winner === 'teamBlue' ? 'Blue' : 'Read'} team WINNER</p>
                      }
                      <p style={{ borderRadius: 6, padding: 10, background: COLORS.RED, border: `4px solid ${COLORS.RED}` }}>
                        🔴 Red team cards : {getRemainingCardsTeam('teamRed')} ({getTeam('teamRed').nbTryLeft} try left)
                      </p>
                    </div>
                    <div className='flex-container-center'>
                      <ImagesGrid />
                    </div>
                    {teamPlaying === myPlayer?.teamId && !myPlayer?.isGameMaster && gameStatus === 'playing' &&
                      <button onClick={() => nextTeamToPlay()}>OK NEXT TEAM</button>
                    }
                  </>
                }
                {gameStatus === 'finished' && amIHost() &&
                  <button onClick={setInWaitingBeforeStart}>RESTART</button>}
              </div>
            )}

          </div>}
        </div >}
    </>
  );
};

export default App;

