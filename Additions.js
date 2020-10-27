/**
* Pivots a fiddler into a new fiddler. Takes fiddler and makes a new one with rows derived from the groupByHeader, columns derived from the values in columnHeader, and the data from the dataHeader.
* @param {Fiddler} fiddler a vertical, database-style fiddler
* @param {String} groupByHeader the header in fiddler that will become the rows in the new fiddler
* @param {String} columnHeader the header in fiddler that will become the columns in the new fiddler
* @param {String} dataHeader the header in fiddler that will become the values in the new fiddler
* @return {Fiddler} fiddler that is a horizontal, human-readable table
*/
function pivot(fiddler, groupByHeader, columnHeader, dataHeader) {
  //create map of unique values in groupByHeader column (id) to an object with values in columnHeader mapped to values in dataHeader
  var idToData = {};
  fiddler.getData().forEach(function(row) {
    var id = row[groupByHeader];
    //if id doesn't exist in map yet, add it
    if(!idToData[id]) { idToData[id] = {}; }
    //update data mapped to id with this row's value in columnHeader as key, and this row's value in dataHeader as value
    idToData[id][row[columnHeader]] = row[dataHeader];
  })
  
  //for each id (unique value in groupByHeader column)
  //create a row entry
  var pivotedData = [];
  Object.keys(idToData).forEach(function(id) {
    var newRow = idToData[id]
    newRow[groupByHeader] = id;
    pivotedData.push(newRow);
  })
  
  //create fiddler from pivotData
  //move the id column to the front of the fiddler
  var pivotedFiddler = new cUseful.Fiddler().setData(pivotedData);
  pivotedFiddler.moveColumn(groupByHeader, pivotedFiddler.getHeaderByIndex(0));
  
  return pivotedFiddler;
}

/**
* Unpivots a fiddler into a new fiddler. Takes fiddler and makes a new fiddler with one row for every row/column combination specifed between columnStart and columnEnd.
* @param {Fiddler} fiddler the fiddler to unpivot
* @param {String} columnStart the header of the column to start the unpivot on
* @param {String} columnEnd the header of the of the column to end the unpivot on, including this one
* @param {String[]} outputHeaders the headers of the new fiddler, should only be 2
* @param {String[]} columnsToRetain the headers of the fiddler that should have their values retained in each row of the new fiddler
* @return {Fiddler} the new fiddler that is unpivoted
*/
function unpivot(fiddler, columnStart, columnEnd, outputHeaders, columnsToRetain) {
  columnStart = columnStart || fiddler.getHeaderByIndex(0);
  columnEnd = columnEnd || fiddler.getHeaderByIndex(-1);
  if(outputHeaders && outputHeaders.length !== 2) throw new Error("outputHeaders should only have two values")
  outputHeaders = outputHeaders || ["Col1, Col2"];
  columnsToRetain = columnsToRetain || [];
  
  //get columns to unpivot
  var columnsToUnpivot = fiddler.getHeadersBetween(columnStart, columnEnd);
  
  //set header values of output, which will populate new fiddler
  //any columns being retained will keep their header names
  var outputValues = [outputHeaders];
  columnsToRetain.forEach(function(retainCol){outputValues.push(row[retainCol])});
  
  //set data values of output
  fiddler.getData().forEach(function(row) {
    columnsToUnpivot.forEach(function(column) {
      var newRow = [column, row[column]];
      columnsToRetain.forEach(function(retainCol){newRow.push(row[retainCol])});
      outputValues.push(newRow);
    })
  })
  
  return new cUseful.Fiddler().setValues(outputValues);
}

/**
* Updates values in targetFiddler based on updateFiddler and key column. Appends missing rows and columns to targetFiddler, if specified.
* If multiple matches are found in updateFiddler, only saves values from last match.
* @param {Fiddler} targetFiddler the fiddler being changed with new values, potentially new rows, columns
* @param {Fiddler} updateFiddler the fiddler driving the updates
* @param {String} key the column in targetFiddler and updateFiddler to compare, similar to a foreign key
* @param {boolean} appendRowIfMissing if the targetFiddler should be appended with rows from updateFiddler that don't have a matching key
* @param {boolean} appendColIfMissing if the targetFiddler should be appended with columns from updateFiddler that aren't in targetFiddler
* @return {Fiddler} the targetFiddler with updates
*/
function join(targetFiddler, updateFiddler, key, appendRowIfMissing, appendColIfMissing) {
  appendRowIfMissing = appendRowIfMissing || false;
  appendColIfMissing = appendColIfMissing || false;
  
  var targetHeaders = targetFiddler.getHeaders();
  var updateHeaders = updateFiddler.getHeaders();
  
  //add columns to targetFiddler that are in updateFiddler
  if(appendColIfMissing){
    updateHeaders.forEach(function(updateHeader){
      if(targetHeaders.indexOf(updateHeader) === -1) targetFiddler.insertColumn(updateHeader)
    })
    targetHeaders = targetFiddler.getHeaders();
  }
  
  //remove columns from updateFiddler that aren't in targetFiddler
  //only necessary for appendRowIfMissing which needs an exact match
  updateFiddler = reduceHeaders(updateFiddler,targetFiddler);
  updateHeaders = updateFiddler.getHeaders();
  
  //for each row in updateFiddler
  //find if there are matching key(s) in targetFiddler
  //if there are matches on key, update row values in targetFiddler with updateFiddler values from last match
  //if there are no matches AND missing rows should be appended, add rows to targetFiddler
  updateFiddler.getData().forEach (function (updateRow) {
    var matches = targetFiddler.selectRows (key, function(value) {
      return value === updateRow[key];
    });
  
    if (matches.length) {
      var lastMatch = matches[matches.length - 1];
      targetHeaders.forEach(function(targetHeader){   
        if (updateHeaders.indexOf(targetHeader) !== -1) { 
          targetFiddler.getData()[lastMatch][targetHeader] = updateRow[targetHeader];
        }
      })
    } else if (appendRowIfMissing){
      targetHeaders.forEach(function(targetHeader){   
        if(updateRow[targetHeader] === undefined) { 
          updateRow[targetHeader] = null
        }
      })
      targetFiddler.insertRows(undefined, 1, updateRow);
    }
  });
  
  return targetFiddler
}

/**
* Reduces the headers in targetFiddler to those that match updateFiddler.
* Creates a new fiddler, leaving the targetFiddler untouched. Does not add columns to targetFiddler, even if they are in updateFiddler.
* @param {Fiddler} targetFiddler the fiddler being changed, althoug no effect will take place on this fiddler
* @param {Fiddler} updateFiddler the fiddler driving the updates
* @return {Fiddler} a new fiddler that has targetFiddler data but only has headers that are in updateFiddler
*/
function reduceHeaders(targetFiddler, updateFiddler){
  //create new fiddler to avoid side effects
  var outputFiddler = new cUseful.Fiddler().setValues(targetFiddler.createValues());
  var updateHeaders = updateFiddler.getHeaders();
  
  //remove columns not in targetFiddler
  outputFiddler
  .filterColumns(function(header) {
    return updateHeaders.indexOf(header) !== -1;
  })
  updateHeaders.forEach(function(header) {
    if(outputFiddler.getHeaders().indexOf(header) === -1) return
    outputFiddler.moveColumn(header)
  })
  
  if(outputFiddler.getHeaders().length === 0) throw new Error("targetFiddler has no data left after reducing headers to match updateFiddler");
  
  return outputFiddler
}

/**
* Converts a fiddler into an html table, useful for emailing data in fiddler.
* @param {Fiddler} fiddler the fiddler to convert
* @param {String[]} columnsToInclude the columns to include in the html table, default is all headers
* @param {String[]} columnDisplayNames the corresponding display names for the columns, default is the headers as is
* @return {String} the html table
*/
function createHtmlTable(fiddler, columnsToInclude, columnDisplayNames){
  if(!fiddler) throw new Error ("fiddler must be defined.");
  if(fiddler.getData().length < 1) throw new Error("fiddler must have data defined.");
  columnsToInclude = columnsToInclude || fiddler.getHeaders();
  if(columnDisplayNames && columnsToInclude.length !== columnDisplayNames.length) throw new Error("columnsToInclude must have the same number of values as columnDisplayNames."); 
  var headers = columnDisplayNames || columnsToInclude;
  
  //build html table
  //fix this: table format is set, would like to create formatting based on fiddler
  var tableFormat = 'style="border:1.5px solid black;border-collapse:collapse;text-align:center" border = 1.5 cellpadding = 5';
  var html = ['<table '+tableFormat+'>'];
  
  //populate header row
  html.push('<tr>');
  headers.forEach(function(header) {
    html.push('<td>'+'<b>'+header+'</b>'+'</td>');
  })
  html.push('</tr>');
  
  //populate data rows
  fiddler.getData().forEach(function(row) {
    html.push('<tr>');
    Object.keys(row).forEach(function(key) { html.push('<td>'+row[key]+'</td>'); })
    html.push('</tr>');
  })
  html.push('</table>');

  return html.join('');  
}
