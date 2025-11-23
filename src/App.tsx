import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './routes'
import { TripProvider } from './contexts/TripContext'
import { ParticipantProvider } from './contexts/ParticipantContext'

function App() {
  return (
    <BrowserRouter>
      <TripProvider>
        <ParticipantProvider>
          <AppRoutes />
        </ParticipantProvider>
      </TripProvider>
    </BrowserRouter>
  )
}

export default App
