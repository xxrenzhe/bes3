import { bootstrapApplication } from '../src/lib/bootstrap'

bootstrapApplication()
  .then(() => {
    console.log('Bes3 database initialized successfully.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Failed to initialize Bes3 database:', error)
    process.exit(1)
  })
