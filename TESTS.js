function testPivot() {
  var reportsSpreadsheet = SpreadsheetApp.openById('1b3J-QlmfhDx8zJXQwZT3m084yqSjdf1ULHeNsmxYAvM');
  var gradebookDataFiddler = new cUseful.Fiddler(reportsSpreadsheet.getSheetByName('raw_GradebookData'));
  //gradebookDataFiddler.dumpValues(SpreadsheetApp.openById('1LL3C8WT-Zo7kx0hY_zvbfvHNPXxUfcVD5UNtP2ZTQEE').getSheets()[2]);

  //transform raw data into academic-specific
  //filter out comment rows
  //filter out practice demonstrations
  var subjects = ['Language Arts','Math','Research','Elective','Vocation','Advisory','Club','Senior Project','Career Development', 'CCW'];
  gradebookDataFiddler
  .filterRows(function(row,properties){return subjects.indexOf(row['Subject']) != -1 && row['Subject'] !== "Vocation" && row['SessionName'].indexOf("Session") >= 0})
  .filterRows(function(row){return row['Assignment'].indexOf('Comments') === -1})
  .filterRows(function(row){return row['Assignment'].indexOf('Practice') === -1 })
  .filterRows(function(row){return row['Assignment'].indexOf('practice') === -1 })
  
  //map assignment column so it contains subject
  gradebookDataFiddler
  .mapColumn('Assignment',function(value,properties){return properties.row['Subject'] + " - " + value})
  
  //sort so that the pivot works correctly
  gradebookDataFiddler
  .sortFiddler('SessionName')
  .sortFiddler('Assignment')

  
//create and post human-readable version
  //pivot to human-readable format
  var gradebookFiddler = pivot(gradebookDataFiddler, "Name", "Assignment", "Grade");
  
  gradebookFiddler.dumpValues(SpreadsheetApp.openById('1LL3C8WT-Zo7kx0hY_zvbfvHNPXxUfcVD5UNtP2ZTQEE').getSheets()[1]);
  
}


//test join
function testJoin() {
  var reportsSpreadsheet = SpreadsheetApp.openById('1b3J-QlmfhDx8zJXQwZT3m084yqSjdf1ULHeNsmxYAvM');
  var fiddler = createAcademicData_(new cUseful.Fiddler(reportsSpreadsheet.getSheetByName('raw_GradebookData')));
  fiddler.dumpValues(SpreadsheetApp.openById('1LL3C8WT-Zo7kx0hY_zvbfvHNPXxUfcVD5UNtP2ZTQEE').getSheets()[0]);
  Logger.log(fiddler.getData()[0]);
}

function createAcademicData_(gradebookDataFiddler){ 
//transform raw data into academic-specific
  //filter out comment rows
  //filter out practice demonstrations
  var subjects = ['Language Arts','Math','Research','Elective','Vocation','Advisory','Club','Senior Project','Career Development', 'CCW'];
  gradebookDataFiddler
  .filterRows(function(row,properties){return subjects.indexOf(row['Subject']) != -1 && row['Subject'] !== "Vocation" && row['SessionName'].indexOf("Session") >= 0})
  .filterRows(function(row){return row['Assignment'].indexOf('Comments') === -1})
  .filterRows(function(row){return row['Assignment'].indexOf('Practice') === -1 })
  .filterRows(function(row){return row['Assignment'].indexOf('practice') === -1 })
  
  //map assignment column so it contains subject
  gradebookDataFiddler
  .mapColumn('Assignment',function(value,properties){return properties.row['Subject'] + " - " + value})
  
  //sort so that the pivot works correctly
  gradebookDataFiddler
  .sortFiddler('SessionName')
  .sortFiddler('Assignment')

  
//create and post human-readable version
  //pivot to human-readable format
  var gradebookFiddler = pivot(gradebookDataFiddler, "Name", "Assignment", "Grade");

  //add in demographic columns
  var demographicFiddler = new cUseful.Fiddler(SpreadsheetApp.openById('1lU8HITH1UCHRcXHLljJAZyiIYQ2I6Txrg5cwDLPqD6A').getSheetByName("Assignments"));
  
  gradebookFiddler
  .insertColumn('GPS')
  .insertColumn('Side')
  .insertColumn('Activity Status')
  .insertColumn('IEP Status')
  Logger.log('after insert: ' + gradebookFiddler.getHeaders());
 
  gradebookFiddler = join(gradebookFiddler, demographicFiddler, 'Name');
  Logger.log('after join: ' + gradebookFiddler.getHeaders());
  
    //order columns
  var demonstrations = getAllSubjectDemonstrations_();
  var headers = gradebookFiddler.getHeaders();
  demonstrations.forEach(function(demonstration){
    if(headers.indexOf(demonstration) === -1) return
    gradebookFiddler.moveColumn(demonstration)
  })
  Logger.log('after ordering columns: ' + gradebookFiddler.getHeaders());
  
  
  //sort rows
  gradebookFiddler
  .sortFiddler("Name")
  .sortFiddler("GPS")
  .sortFiddler("Side")
  .setColumnFormat({
    horizontalAlignments : "center",
  },  gradebookFiddler.getHeaders().filter(function(value) { return value !== "Name" && value !== "Email"}))
  Logger.log('after sorting rows: ' + gradebookFiddler.getHeaders());
  
 
  
  return gradebookFiddler
}

function getAllSubjectDemonstrations_(){ 
  var demonstrationsObject  = {
    "Language Arts" : ["Telling Your Story", "Language Arts Elective"],
    "Math" : ["Financial Literacy", "Math Elective"],
    "Research" : ["Intro to Advocacy","Research Elective"],
    "Senior Project" : ["Part I Foundations", "Part II Slideshow", "Part III Presentation"],
    "CASAS" : ['Test Requirement','Math Pre-Test','Math Post-Test 1','Math Post-Test 2','Math Post-Test 3','Reading Pre-Test','Reading Post-Test 1','Reading Post-Test 2','Reading Post-Test 3'],
    "Elective" : ['Future Focused Elective'],
    "Career Development" : ['Career Portfolio 1', 'Career Portfolio 2', 'Career Portfolio 3']
  }
  var values = []
  Object.keys(demonstrationsObject).forEach(function(subject){
    demonstrationsObject[subject].forEach(function(demonstration){
      values.push(subject + " - " + demonstration);
    })
  })
  
  return values
}


//test unpivot
function testUnpivot() {
  var fiddler = new cUseful.Fiddler(SpreadsheetApp.openById('1b3J-QlmfhDx8zJXQwZT3m084yqSjdf1ULHeNsmxYAvM').getSheetByName('Academics'));
 
  unpivot(fiddler, "Name");
  unpivot(fiddler, "GPS");
  unpivot(fiddler,"Side");
  unpivot(fiddler, "Elective - Future Focused Elective");
  unpivot(fiddler, "Career Development - Career Portfolio 1");
  
  var body = "Hello friend, " + "<br>" + "<br>";
  body += createHtmlTable(fiddler)
  //MailApp.sendEmail('eshapiro@ybphilly.org', 'test unpivot', 'test', 
                    //{htmlBody: body}
  //)
}

//correction of getHeaders
function getHeadersBetween (self, start , finish ) {
    start = start || self.getHeaderByIndex(0);
    finish = finish || self.getHeaderByIndex(-1);
    startIndex = self.getHeaderIndex(start);
    finishIndex = self.getHeaderIndex(finish);
  Logger.log('startIndex: ' + startIndex);
  Logger.log('finishIndex: ' + finishIndex);
    if (startIndex === -1) throw 'column ' + start + ' not found';
    if (finishIndex === -1) throw 'column ' + finish + ' not found';
  var [s,f] = [startIndex, finishIndex].sort(function(a,b) { return a - b });
  Logger.log('[s,f]: ' + [s,f]);
    var list = self.getHeaders().slice (s,f+1);
  Logger.log(list);
    return startIndex > finishIndex ? list.reverse() : list;
}

//test html table
function testHtmlTable() {
  var fiddler = new cUseful.Fiddler(SpreadsheetApp.openById('1b3J-QlmfhDx8zJXQwZT3m084yqSjdf1ULHeNsmxYAvM').getSheetByName('Academics'));
  var body = "Hello friend, " + "<br>" + "<br>";
  body += createHtmlTable(fiddler)
  MailApp.sendEmail('eshapiro@ybphilly.org', 'test', 'test', 
                    {htmlBody: body}
  )
}
