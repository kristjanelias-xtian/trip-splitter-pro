import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './routes'
import { TripProvider } from './contexts/TripContext'
import { ParticipantProvider } from './contexts/ParticipantContext'
import { ExpenseProvider } from './contexts/ExpenseContext'

function App() {
  return (
    <BrowserRouter>
      <TripProvider>
        <ParticipantProvider>
          <ExpenseProvider>
            <AppRoutes />
          </ExpenseProvider>
        </ParticipantProvider>
      </TripProvider>
    </BrowserRouter>
  )
}

export default App
