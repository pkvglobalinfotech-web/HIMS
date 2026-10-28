(function () {
    'use strict';

    angular
        .module('common.utils')
	.controller('dynamicformCtrl', ['utl', '$scope', '$timeout', '$state', '$translate', function (utl, $scope, $timeout, $state, $translate) {
	    var cvm = this;
	    cvm.datePickerOptions = $scope.$parent.datePickerOptions;

	    $scope.$watch('cvm.schema',
            function (newValue) {
                if (newValue) {
                    cvm.renderControls();
                }
       });

	    cvm.renderControls = function () {
	        prepareControls(cvm.schema.controls);
	        console.log(cvm.schema);
	    };

	    function prepareControls(inputControls) {
	        if (inputControls) {
	            //controls per row
	            var rowPosMap = {};
	            for (var idx in inputControls) {
	                var currentRow = inputControls[idx].position.r;
	                rowPosMap[currentRow] = rowPosMap[currentRow] || 0;
	                rowPosMap[currentRow]++;
	            }

	            for (var idx in inputControls) {
	                var item = inputControls[idx];
	                var controlType = (item.type && String(item.type).trim() !== '') ? item.type : 'dummy';
	                item.tmpl = 'dyn-' + controlType + '.html';
	                item.colspan = 12 / (rowPosMap[item.position.r] || 1);

	                if (item.controls) {
	                    prepareControls(item.controls)
	                }
	            }
	        }
	    }

	    cvm.saveClick = function () {

	   }

	   cvm.cancelClick = function () {

	   }

	    cvm.init = function () {
	        //Init logic
	    }

	    //caution : base method, please don't modifiy
	    cvm.$onInit = function () {
	        $timeout(cvm.init, 100);
	    }
	}])
    .component('dynamicform', {
        bindings: {
            modeldata: "=",
            schema : "=",
        },
        controller: 'dynamicformCtrl',
        controllerAs: 'cvm',
        templateUrl: 'vendor/components/dynamicform.html'
    })

})();