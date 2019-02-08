let http = require('http');
let https = require('https');

// https.globalAgent.maxSockets = 5;
// http.globalAgent.maxSockets = 5;

let Subject = require('./CourseInfo/Subject');
let Course = require('./CourseInfo/Course')
let Section = require('./CourseInfo/Section')
let SubjectScraper = require('./SubjectScraper');

let rp = require('request-promise');
let cheerio = require('cheerio');

let UBCCourses = 'https://courses.students.ubc.ca/cs/courseschedule?pname=subjarea&tname=subj-all-departments';

let SubjectListMap = {};

rp(UBCCourses)
    .then(function (html) {
        let SubjectList = [];

        let $ = cheerio.load(html);
        let mainTable = $('#mainTable');
        let tbody = $('tbody', mainTable);
        let subjects = $('tr', tbody);
        
        subjects.each(function(i, elem) {

            let codeChild = $(this).children().first();
            let code = codeChild.text();
            // console.log(code);

            let link = $('a', codeChild).attr('href');
            // console.log(link);

            let titleChild = $(codeChild).next();
            let title = titleChild.text();
            // console.log(title);

            let facultyChild = $(titleChild).next();
            let faculty = facultyChild.text();
            // console.log(faculty);

            let subject = new Subject(code, link, title, faculty);
            SubjectList.push(subject);
            SubjectListMap[code] = subject;

        });

        let promises = [];
        for (let subject of SubjectList.slice(SubjectList.length / 2, SubjectList.length / 2 + 10)) {
            if (subject.link !== undefined && subject.link !== null) {
                // console.log(subject.link);
                promises.push(rp('https://courses.students.ubc.ca' + subject.link)
                .catch(function (err) {
                    console.log(err);
                }));
            }
        }

        return promises;
    })
    .then(promises => Promise.all(promises))
    .then(function (promises) {
        CourseList = [];
        // console.log(SubjectListMap);
        // console.log(promises.length);
        for (let promise of promises) {
            let $ = cheerio.load(promise);


            let mainTable = $('#mainTable');
            let tbody = $('tbody', mainTable);
            let subjects = $('tr', tbody);
            
            subjects.each(function(i, elem) {

                let course_tr = $(this).toArray()[0];
                let course_td_a = course_tr.children[0].children[0];
                let course_td_a_href = course_td_a.attribs.href;
                let course_td_a_text = course_td_a.children[0].data;
                let course_td_title = course_tr.children[1].children[0].data;

                let course = new Course(course_td_a_text, course_td_title, course_td_a_href);
                // console.log(SubjectListMap[course.subject_code]);
                SubjectListMap[course.subject_code].courses[course.course_number] = course;
                // console.log(SubjectListMap[course.subject_code]);
                CourseList.push(course);
            });
            // console.log(SubjectListMap['GERM']);

            // console.log(SubjectListMap);
        }

        let sectionPromises = []
        for (let course of CourseList.slice(CourseList.length / 2, CourseList.length / 2 + 10)) {
            sectionPromises.push(rp('https://courses.students.ubc.ca' + course.course_link));
        }
        return sectionPromises;
    })
    .then(promises => Promise.all(promises))
    .then(function (sectionPromises) {
        // console.log(SubjectListMap);
        // console.log(CourseList);
        let SectionList = [];

        for (let promise of sectionPromises) {
            let $ = cheerio.load(promise);

            let mainTable = $('table');
            let tbody = $('tbody', mainTable);
            let subjects = $('tr', tbody);

            let h4 = $('h4');
            let description = h4.next().text();

            let cdfText = $('#cdfText');
            let credits = cdfText.next().text();
            // console.log(course_description.text());

            subjects.each(function(i, elem) {
                let curr_td = $(this).children().first();

                let status = curr_td.text();
                curr_td = curr_td.next();
                let curr_section = curr_td.text();
                let href = $('a', curr_td).attr('href');
                curr_td = curr_td.next();
                let activity = curr_td.text();
                curr_td = curr_td.next();
                let term = curr_td.text();
                curr_td = curr_td.next();
                let interval = curr_td.text();
                curr_td = curr_td.next();
                let days = curr_td.text();
                curr_td = curr_td.next();
                let start = curr_td.text();
                curr_td = curr_td.next();
                let end = curr_td.text();
                curr_td = curr_td.next();
                let comments = curr_td.text();

                let section = new Section(status, curr_section, href, activity, term, interval, days, start, end, comments);
                // console.log(section.subject_code);
                // console.log(section.course_number);
                if (section.course_number !== undefined) {
                    let currCourse = SubjectListMap[section.subject_code].courses[section.course_number];
                    if (currCourse.credits === undefined) {
                        currCourse.credits = credits;
                    }
                    if (currCourse.description === undefined) {
                        currCourse.description = description;
                    }
                    currCourse.sections[section.section_number] = section;
                    SectionList.push(section);   
                    
                    // console.log(currCourse);
                }
                // console.log(section.section_number);
                // console.log(SubjectListMap);
                // console.log(SubjectListMap[section.subject_code].courses);
                // let course = SubjectListMap[section.subject_code];
                // console.log(course);
                // SubjectListMap[section.subject_code].courses[section.course_number].sections[section.section_number] = section;
                // console.log(section);
                // SectionList.push(section);
            });
        }
        let innerSectionPromises = []
        for (let section of SectionList.slice(SectionList.length / 2, SectionList.length / 2 + 10)) {
            innerSectionPromises.push(rp('https://courses.students.ubc.ca' + section.href));
        }
        return innerSectionPromises;
        // console.log(SubjectListMap['GERM']);
    })
    .then(promises => Promise.all(promises))
    .then(function (sectionPromises) {

        for (let promise of sectionPromises) {
            let $ = cheerio.load(promise);

        }
    })
    .catch(function (err) {
        console.log(err);
    });
