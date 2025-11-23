import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './routes'
import { TripProvider } from './contexts/TripContext'

function App() {
  return (
    <BrowserRouter>
      <TripProvider>
        <AppRoutes />
      </TripProvider>
    </BrowserRouter>
  )
}

export default App
