const express = require('express');
const authRoutes = require('./auth');
const catalogRoutes = require('./lookup');
const studentRoutes = require('./students');
const planRoutes = require('./plans');
const searchRoutes = require('./search');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/catalog', catalogRoutes);
router.use('/students', studentRoutes);
router.use('/plans', planRoutes);
router.use('/search', searchRoutes);
router.use('/courses', catalogRoutes);
router.use('/semesters', catalogRoutes);
router.use('/departments', catalogRoutes);
router.use('/semester-courses', catalogRoutes);
module.exports = router;

