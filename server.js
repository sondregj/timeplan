require('dotenv').config()

const express = require('express')
    , rp = require('request-promise-native')
	  , fs = require('fs')
	  , ical2json = require('ical2json')
    , subjects = require('./subjects')

const updateCalFile = () => {
  console.log('Updating cal.')
  
	rp(process.env.CAL_URL)
    .then(body => {
      console.log('Fetched calendar:', body.length)
      
      const converted = ical2json.convert(body)
      const cal = converted['VCALENDAR'][0]

      const events = Array.from(cal['VEVENT'])
        .filter(x => x['SUMMARY'] && x['LOCATION'])
        .map(event => {
          event['SUMMARY'] = event['SUMMARY']
            .split('Emne: ')
            .filter(x => subjects.hasOwnProperty(x))
            .map(x => `${x} | ${subjects[x]}`)[0]

          event['LOCATION'] = event['LOCATION']
            //.replace('\\, ', '')
            .split('\\, ')
            .filter(x => x !== '' && x !== undefined)
            .reduce((acc, cur) => `${acc} + ${cur}`) + '\\, HVL Kronstad'
                    
          event['GEO'] = '60.369196;5.350845'
          
          event['URL'] = 'https://hvl.no'
          
          const description = event['DESCRIPTION']
            .split('\\n')
          
          event['DESCRIPTION'] = `Forelesning: ${description[description.length - 1]}`
          
          description
            .filter((x, i, arr) => i !== arr.length - 1)
            .forEach(attendee => {
              event[`ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=${attendee}`] = 'MAILTO:post@hvl.no'
            })
          
          return event
        })

      console.log(events.length + ' events')

      cal['PRODID'] = 'TimeEdit'
      cal['X-WR-CALNAME'] = process.env.CAL_NAME
      cal['VEVENT'] = events

      fs.writeFile(process.cwd() + '/cal/cal.ics', ical2json.revert(converted), () => {
        console.log('File written.\n')
		  })
	  })
    .catch(err => console.log('Could not get calendar.'))
}

setTimeout(updateCalFile, 300000)
updateCalFile()

const app = express()
  .get('/', (req, res) => res.redirect('/Calendar.ics'))
  .get('/Calendar.ics', (req, res) => res.sendFile(process.cwd() + '/cal/cal.ics'))
  .listen(process.env.PORT, () => console.log('Server started.'))
