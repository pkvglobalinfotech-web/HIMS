(function () {
    'use strict';

    angular
        .module('app.pages')
        .controller('admissionRequestListController', admissionRequestListController);

    function admissionRequestListController($scope, $stateParams, $state, $translate, utl, $filter, modalConfig) {
        var vm = this;
        angular.extend(this, utl.Ctrl.getPrivilegeCtrl({
            $scope: $scope
        }));

        $scope.Items = [];
        $scope.currentfilter = {
            AdmissionRequestTypeId: -1,
            admissionstatusid: 2,
            DoctorId: -1,
            namemrn: '',
            FromDate: utl.Formatter.getCurrentDate(),
            ToDate: utl.Formatter.getCurrentDate(),
        };
        $scope.currentcontext = {};
        $scope.currentcontext.pid = parseInt(utl.Session.getEMRPatientId());
        $scope.currentcontext.eid = parseInt(utl.Session.getEncounterId());

        $scope.getListCallback = function (scope, res, options, hasError) {
            vm.gridConfig.data = res.Data;
            vm.gridConfig.pagerObj.totalItems = res.PageContext.TotalRecords;
        };

        $scope.getList = function () {
            var From = $filter('date')($scope.currentfilter.FromDate, 'yyyy-MM-dd 00:00:00') || null;
            var To = $filter('date')($scope.currentfilter.ToDate, 'yyyy-MM-dd 23:59:59') || null;
            var inputData = {
                Params: [
                    { Key: 16, Value: From },
                    { Key: 17, Value: To },
                    { Key: 13, Value: $scope.currentfilter.RequestedNo },
                    { Key: 11, Value: $scope.currentcontext.pid },
                    { Key: 2, Value: $scope.currentfilter.admissionstatusid },
                    { Key: 8, Value: $scope.currentfilter.AdmissionRequestTypeId },
                ],
                PageContext: {
                    PageSize: vm.gridConfig.pagerObj.pageSize,
                    PageNumber: vm.gridConfig.pagerObj.currentPage
                }
            };

            var options = {
                action: 'IPManagement/admissionrequest/GetAdmissionRequests',
                data: inputData,
                type: 'post',
                onComplete: $scope.getListCallback
            };

            utl.Http.doAction(options);
        };

        $scope.doctor_dashboard = function () {
            $state.go('app.doctordashboard');
        }


        $scope.deleteItemCallback = function (scope, data, options, hasError) {
            utl.Alert.showSuccessMsg($translate.instant('common.delete_successmsg.lbl'));
            $scope.getList();
        };

        $scope.onDeleteConfirmed = function (deleteId) {
            var options = {
                action: 'IPManagement/admissionrequest/DeleteAdmissionRequest',
                data: { Id: deleteId },
                type: 'post',
                onComplete: $scope.deleteItemCallback
            };
            utl.Http.doAction(options);
        };

        $scope.addNew = function () {
            $state.go('patientemr.admissionrequest', { id: 0 });
        };

        $scope.cancelItem = function () {
            $scope.item.AdmissionRequestStatusId = 3;
            var options = {
                action: 'IPManagement/admissionrequest/UpdateAdmissionRequest',
                data: { Data: $scope.item },
                type: 'post',
                onComplete: $scope.getList
            };

            utl.Http.doAction(options);
        }

        $scope.handleEvents = function (actionType, entity) {
            if (actionType == 'edit') {
                $state.go('patientemr.admissionrequest', { id: entity.Id });
            } else if (actionType == 'delete') {
                utl.Dialog.confirmDelete($scope.onDeleteConfirmed, entity.Id);
            } else if (actionType == 'view') {
                $state.go('patientemr.admissionrequest', { id: entity.Id });
            }
        };

        vm.gridConfig = {
            enableColumnResizing: true,
            columnDefs: [{
                field: "RequestDate",
                displayName: $translate.instant('taskmanagement.date.lbl'),
                cellTemplate: "<div class='ui-grid-cell-contents'><span class='pl-3'>{{entity.RequestDate | date : 'dd-MMM-yyyy'}}&nbsp;</span>" + "</div>"
            },
            { field: "RequestIdentifier", displayName: $translate.instant('Request #') },
            { field: "AdmissionRequestType.Description", displayName: $translate.instant('taskmanagement.type.lbl') },
            { field: "Diagnosis.DiagnosisName", displayName: $translate.instant('Diagnosis') },
            { field: "NurseInstruction", displayName: $translate.instant('NurseInstruction') },
            { field: "AdmissionRequestStatus .Description", displayName: $translate.instant('taskmanagement.status.lbl') },
            {
                field: "Id",
                displayName: $translate.instant('common.actions_col.lbl'),
                cellTemplate: '<div class="ui-grid-cell-contents">\
                    <span class="grid-action" ng-click="handleEvents(\'edit\',entity)"><i class="fa fa-pencil-square-o" aria-hidden="true"></i></span>\
                </div>',
                handleEvent: $scope.handleEvents,
                actions: []
            }
            ],
            pagerObj: { totalItems: 0, currentPage: 1, startIndex: 0, pageSize: 25 }
        };


        $scope.lookupCallback = function (scope, data, options, hasError) {
            $scope.lookup = hasError ? {} : data;
            $scope.getList();
        };

        $scope.initLookup = function () {
            var inputData = [
                { "Key": "AdmissionRequestStatus" },
                { "Key": "AdmissionRequestType" },
            ];
            var options = {
                action: 'General/Options/getoptions',
                data: inputData,
                type: 'post',
                onComplete: $scope.lookupCallback
            };
            utl.Http.doAction(options);
        };

        // -------------------------------------------------------------
        // React Bridge integration for AdmissionRequestListScreen
        // -------------------------------------------------------------
        $scope.refreshReactProps = function () {
            $scope.reactProps = {
                items: vm.gridConfig.data || [],
                totalItems: vm.gridConfig.pagerObj.totalItems || 0,
                currentPage: vm.gridConfig.pagerObj.currentPage || 1,
                pageSize: vm.gridConfig.pagerObj.pageSize || 25,
                currentfilter: {
                    RequestedNo: $scope.currentfilter.RequestedNo,
                    FromDate: $scope.currentfilter.FromDate,
                    ToDate: $scope.currentfilter.ToDate,
                    admissionstatusid: $scope.currentfilter.admissionstatusid,
                    AdmissionRequestTypeId: $scope.currentfilter.AdmissionRequestTypeId
                },
                lookup: $scope.lookup || {}
            };
        };

        var origGetListCallback = $scope.getListCallback;
        $scope.getListCallback = function (scope, res, options, hasError) {
            origGetListCallback(scope, res, options, hasError);
            $scope.refreshReactProps();
        };

        var origLookupCallback = $scope.lookupCallback;
        $scope.lookupCallback = function (scope, data, options, hasError) {
            origLookupCallback(scope, data, options, hasError);
            $scope.refreshReactProps();
        };

        $scope.handleReactAction = function (actionName, payload) {
            payload = payload || {};
            switch (actionName) {
                case 'filterChange':
                    if (payload.field) {
                        $scope.currentfilter[payload.field] = payload.value;
                    }
                    $scope.refreshReactProps();
                    break;
                case 'filterChangeAndSearch':
                    if (payload.field) {
                        $scope.currentfilter[payload.field] = payload.value;
                    }
                    vm.gridConfig.pagerObj.currentPage = 1;
                    $scope.getList();
                    break;
                case 'search':
                    vm.gridConfig.pagerObj.currentPage = 1;
                    $scope.getList();
                    break;
                case 'resetFilters':
                    $scope.currentfilter.RequestedNo = '';
                    $scope.currentfilter.FromDate = utl.Formatter.getCurrentDate();
                    $scope.currentfilter.ToDate = utl.Formatter.getCurrentDate();
                    $scope.currentfilter.admissionstatusid = 2;
                    $scope.currentfilter.AdmissionRequestTypeId = -1;
                    vm.gridConfig.pagerObj.currentPage = 1;
                    $scope.getList();
                    break;
                case 'pageChange':
                    vm.gridConfig.pagerObj.currentPage = payload.page;
                    $scope.getList();
                    break;
                case 'addNew':
                    $scope.addNew();
                    break;
                case 'doctorDashboard':
                    $scope.doctor_dashboard();
                    break;
                case 'edit':
                    $scope.handleEvents('edit', payload);
                    break;
                case 'delete':
                    $scope.handleEvents('delete', payload);
                    break;
                default:
                    break;
            }
        };

        $scope.initLookup();
    }

    admissionRequestListController.$inject = ['$scope', '$stateParams', '$state', '$translate', 'utl', '$filter', 'modalConfig'];

})();