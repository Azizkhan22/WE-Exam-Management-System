const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { sequelize } = require('./models');

const departments = require('./routes/departments');
const semesters = require('./routes/semesters');
const students = require('./routes/students');
const rooms = require('./routes/rooms');
const seatingPlans = require('./routes/seatingPlans');
const allocatedSeats = require('./routes/allocatedSeats');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/api/departments', departments);
app.use('/api/semesters', semesters);
app.use('/api/students', students);
app.use('/api/rooms', rooms);
app.use('/api/seating_plans', seatingPlans);
app.use('/api/allocated_seats', allocatedSeats);

app.get('/', (req,res)=> res.json({ok:true, msg:'Exam seating backend running'}));

const PORT = process.env.PORT || 4000;
sequelize.sync().then(()=> {
  app.listen(PORT, ()=> console.log('Server listening on', PORT));
});
