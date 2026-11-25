// Unit tests for the posting classifier, built from real feed titles. Run with: node --test scripts/
import test from 'node:test';
import assert from 'node:assert/strict';
import { isEarlyCareer, opportunityType, term, classifyRole, parseLocations, workMode } from './lib/classify.mjs';

test('keeps student and early-career titles', () => {
  for (const title of [
    'Software Engineering Intern (BS/MS)', '2027 Summer Intern, PhD, Machine Learning, Planning/Prediction',
    'New Graduate Engineer, GNC- \'26/\'27 (Starlink)', 'Apprentice Controls Technician', 'Brex Rotational Program',
    'Reporter Fellow, Local Investigations', 'Analyst, Early Career (Full Stack)', 'Junior Quantitative Developer & Strategist',
    'Technical Functions/Maintenance Intern / Co-op - Spring 2027',
  ]) assert.equal(isEarlyCareer(title), true, title);
});

test('drops senior, recruiting, shift and pipeline postings', () => {
  for (const title of [
    'Group Lead - Manufacturing Engineer', 'University Recruiter', 'Senior Software Engineer',
    'Forklift w/SAP - 2nd Shift', 'Dock Operator 2nd Shift (Shipping)', 'BestDrive Georgia Zone Store Manager',
    'Local Investigations Fellowship Expression of Interest', 'Future Opportunities: Early Career Sales Talent',
    'Internship Program Manager',
  ]) assert.equal(isEarlyCareer(title), false, title);
});

test('opportunity type', () => {
  assert.equal(opportunityType('Technical Functions/Maintenance Intern / Co-op - Spring 2027'), 'Co-op');
  assert.equal(opportunityType('Apprentice Propulsion Test Technician'), 'Apprenticeship');
  assert.equal(opportunityType('AI Research Fellowship, (Summer and Fall 2026)'), 'Fellowship');
  assert.equal(opportunityType('Data Analyst, Intern'), 'Internship');
  assert.equal(opportunityType('Contract Student Worker - Data Analyst (Part-time)'), 'Part-time job');
  assert.equal(opportunityType('Software Engineer, Early Career (AI)'), 'Entry-level job');
});

test('term', () => {
  assert.equal(term('Additive Manufacturing Intern Summer 2027', 'Internship'), 'Summer 2027');
  assert.equal(term('Antenna Intern (Winter 2027)', 'Internship'), 'Winter 2027');
  assert.equal(term('Software Engineer, New Grad', 'Entry-level job'), 'Year-round');
  assert.equal(term('Research Intern', 'Internship'), null);
});

test('role classification uses specific words before generic ones', () => {
  const role = (title, dept, fallback) => classifyRole(title, dept, fallback).role_key;
  assert.equal(role('Security Analyst Intern Summer 2027'), 'Cybersecurity');
  assert.equal(role('Systems Engineering Intern Summer 2027'), 'Industrial Engineering');
  assert.equal(role('2027 Library Science Intern'), 'Library & Information Science');
  assert.equal(role('Research Intern', 'AI Research'), 'Artificial Intelligence & Machine Learning');
  assert.equal(role('Research Intern', ''), 'Behavioral Research');
  assert.equal(role('Fall 2027 National Security Fellowship'), 'Diplomacy & International Affairs');
  assert.equal(role('Apprentice Propulsion Test Technician'), 'Maintenance Technician');
  assert.equal(role('2027 Flight Test Engineer Intern'), 'Aerospace Engineering');
  assert.equal(role('Data Science Intern (2027 Start)'), 'Data Science');
  assert.equal(role('UX Designer Intern [Summer 2027]'), 'UX & UI Design');
  assert.equal(role('Reporting Fellow', '', { role_key: 'Journalism', field_key: 'Media, Writing & Communications' }), 'Journalism');
  assert.equal(role('Summer Fellow', '', { role_key: 'Policy Analysis', field_key: 'Government & Public Policy' }), 'Policy Analysis');
});

test('location parsing keeps US postings and labels them cleanly', () => {
  assert.deepEqual(parseLocations(['San Francisco, CA']).label, 'San Francisco, CA');
  assert.deepEqual(parseLocations(['New York, New York, United States']).states, ['NY']);
  assert.deepEqual(parseLocations(['Washington, D.C.']).states, ['DC']);
  assert.equal(parseLocations(['Arkansas, AR; Louisiana, LA']).label, 'Arkansas; Louisiana');
  assert.equal(parseLocations(['Remote - USA']).label, 'Remote (US)');
  assert.equal(parseLocations(['IND - Bangalore, India']).us, false);
  assert.equal(parseLocations(['Toronto, CAN']).us, false);
  assert.equal(parseLocations(['A, CA', 'B, NY', 'C, TX', 'D, WA']).label, 'Multiple locations (4)');
});

test('work mode', () => {
  assert.equal(workMode('Hybrid - New York, NY'), 'Hybrid');
  assert.equal(workMode('Remote - USA', '', true), 'Remote');
  assert.equal(workMode('Seattle, WA'), 'On-site');
  assert.equal(workMode('x', 'remote'), 'Remote');
});
