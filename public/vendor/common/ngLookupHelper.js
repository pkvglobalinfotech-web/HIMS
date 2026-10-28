(function() {
    'use strict';

    angular
        .module('common.utils')
        .factory('ngLookupHelper', function () {
        
         var getEnumDesc = function(targetType, inputVal) {
             for (var idx in targetType) {
                 var currentId = targetType[idx].Id;
                 if (angular.isString(inputVal) && inputVal == currentId) {
                     return targetType[idx].Text;
                 }
                 else if (inputVal == parseInt(currentId)) {
                     return targetType[idx].Text;
                 }
             }
             return '';
         }

         var getEnumObj = function(targetType, inputVal) {
             for (var idx in targetType) {
                 var currentId = targetType[idx].Id;
                 if (angular.isString(inputVal) && inputVal == currentId) {
                     return targetType[idx];
                 }
                 else if (inputVal == parseInt(currentId)) {
                     return targetType[idx];
                 }
             }
             return;
         }

         var getEnumObjByText = function(targetType, displayText) {
             var result;
             if (displayText && targetType) {
                var targetLower = ('' + displayText).toLowerCase();
                for (var idx in targetType) {
                    if (!targetType.hasOwnProperty(idx)) continue;
                    var item = targetType[idx];
                    if (!item) continue;
                    var currentValue = item.Text || item.Name || '';

                    if (currentValue && ('' + currentValue).toLowerCase() === targetLower) {
                       result = item;
                       break;
                    }
                }
             }
             return result;
         }


         var getDefaultValue = function(targetType, defaultValue) {
             if (defaultValue && targetType) {
                var targetLower = ('' + defaultValue).toLowerCase();
                for (var idx in targetType) {
                    if (!targetType.hasOwnProperty(idx)) continue;
                    var item = targetType[idx];
                    if (!item) continue;
                    var currentId = item.Id;
                    var currentValue = item.Text || item.Name || '';

                    if (currentValue && ('' + currentValue).toLowerCase() === targetLower) {
                        return item.Id;
                    }
                }
             }
             return -1;
         }
    
         var getPossibleFilters = function(targetType, inputArr) {
             if(inputArr) {
                var result = [];
                for (var idx in targetType) {
                    var currentId = parseInt(targetType[idx].Id);
                    if (inputArr.indexOf(currentId) > -1) {
                        result.push(targetType[idx]);
                    }
                }
                return result;
             } else {
                 return targetType;
             }
         }

        return {
            getDesc : getEnumDesc,
            getDefault : getDefaultValue,
            getObject : getEnumObj,
            getObjectByText : getEnumObjByText,
            getPossibleFilters : getPossibleFilters
        };
    });

})();