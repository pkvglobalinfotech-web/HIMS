(function () {
    'use strict';

    angular
        .module('app.pages')
        .controller('ipclearenceListController', ipclearenceListController);

    function ipclearenceListController($rootScope, $scope, $stateParams, $state, $translate, utl, $timeout, $filter) {
        var vm = this;

        $scope.Items = [];
        $scope.currentfilter = {
            IPClearenceDate: utl.Formatter.getCurrentDate(),
            DepartmentId: parseInt(utl.Session.getCurrentDepartmentId()),
        };

        $scope.getListCallback = function (scope, res, options, hasError) {
            vm.gridConfig.data = res.Data;
            vm.gridConfig.pagerObj.totalItems = res.PageContext.TotalRecords;
            $scope.refreshReactProps();
        };

        $scope.getList = function () {
            var From = $filter('date')($scope.currentfilter.IPClearenceDate, 'yyyy-MM-dd 00:00:00') || null;
            var To = $filter('date')($scope.currentfilter.IPClearenceDate, 'yyyy-MM-dd 23:59:59') || null;
            var inputData = {
                Params: [
                    {
                        Key: 1,
                        Value: $scope.currentfilter.PatientName
                    },
                    {
                        Key: 2,
                        Value: $scope.currentfilter.DepartmentId
                    },
                    { Key: 4, Value: From },
                    { Key: 5, Value: To },
                    {
                        Key: 6,
                        Value: $scope.currentfilter.IPClearenceStatusId
                    }
                ],
                PageContext: {
                    PageSize: vm.gridConfig.pagerObj.pageSize,
                    PageNumber: vm.gridConfig.pagerObj.currentPage
                }
            };

            var options = {
                action: 'IPManagement/IPClearence/GetIPClearences',
                data: inputData,
                type: 'post',
                onComplete: $scope.getListCallback
            };

            utl.Http.doAction(options);
        };

        $scope.addNew = function () {
            $scope.openModal(0);
        }

        $scope.openModal = function (Id) {
            utl.Modal.open('app.ipclearenceform', {
                params: {
                    id: Id
                },
                confirmCallback: $scope.initLookup
            });
        }

        $scope.deleteItemCallback = function (scope, data, options, hasError) {
            utl.Alert.showSuccessMsg($translate.instant('common.delete_successmsg.lbl'));
            $scope.getList();
        };

        $scope.onDeleteConfirmed = function (deleteId) {
            var options = {
                action: 'IPManagement/BedTransfer/DeleteBedTransfer',
                data: {
                    Id: deleteId
                },
                type: 'post',
                onComplete: $scope.deleteItemCallback
            };
            utl.Http.doAction(options);
        }
        $timeout(function () {
            removeFloatingNav();
        }, 100);

        function removeFloatingNav() {
            $rootScope.app.layout.isCollapsed = true;
        }

        $scope.handleEvents = function (actionType, entity) {
            if (actionType == 'view') {
                $scope.openModal(entity.Id);
            } else if (actionType == 'patientinfo') {
                var pid = entity && (entity.PatientId || (entity.Patient && entity.Patient.Id));
                if (pid) {
                    utl.Modal.open('registration.patientprofile', {
                        params: {
                            pid: pid
                        },
                        confirmCallback: $scope.getList
                    });
                }
            }
        };

        $scope.handleReactAction = function (actionType, payload) {
            if (actionType === 'view') {
                var entity = (payload && (payload.entity || payload)) || null;
                var id = entity ? entity.Id : (payload && payload.id ? payload.id : 0);
                $scope.openModal(id);
            } else if (actionType === 'addNew') {
                $scope.addNew();
            } else if (actionType === 'patientinfo') {
                var entity = (payload && (payload.entity || payload)) || null;
                if (entity) {
                    $scope.handleEvents('patientinfo', entity);
                }
            } else if (actionType === 'filterChange') {
                if (payload && payload.field) {
                    $scope.currentfilter[payload.field] = payload.value;
                }
            } else if (actionType === 'search') {
                vm.gridConfig.pagerObj.currentPage = 1;
                $scope.getList();
            } else if (actionType === 'pageChange') {
                if (payload && payload.page) {
                    vm.gridConfig.pagerObj.currentPage = payload.page;
                    $scope.getList();
                }
            }
        };

        $scope.refreshReactProps = function () {
            $scope.reactProps = {
                items: vm.gridConfig.data || [],
                lookup: $scope.lookup || {},
                currentfilter: $scope.currentfilter || {},
                pager: {
                    totalItems: vm.gridConfig.pagerObj.totalItems || 0,
                    currentPage: vm.gridConfig.pagerObj.currentPage || 1,
                    pageSize: vm.gridConfig.pagerObj.pageSize || 25
                }
            };
            $scope.$applyAsync();
        };

        vm.gridConfig = {
            enableColumnResizing: true,
            columnDefs: [
                // { field: "CreatedAt", displayName: $translate.instant('bedtransfer-list.requestedon.lbl') },
                {
                    field: "S.No", displayName: $translate.instant('inventory.purchaseorders.sno.lbl'),
                    cellTemplate: "<div class='ui-grid-cell-contents'><span >{{index+1}}</span> </div>"
                },
                {
                    field: "IPClearenceDate",
                    displayName: $translate.instant('Date'),
                    cellTemplate: "<div class='ui-grid-cell-contents'><span >{{entity.IPClearenceDate | date : 'dd-MMM-yyyy'}}&nbsp;</span>" + "<span >{{entity.IPClearenceDate| date: 'HH:mm'}}</span>" + "</div>"
                },
                {
                    field: "PatientMrn",
                    displayName: $translate.instant('UHID')
                },
                {
                    field: "PatientName",
                    displayName: $translate.instant('Patient Name')
                },
                {
                    field: "WardRoomMaster", displayName: $translate.instant('Ward/Rooms'),
                    cellTemplate: "<div class='ui-grid-cell-contents'>"
                        + "<span >{{entity.WardMaster.WardName}}</span>"
                        + "<span >&nbsp;/&nbsp;{{entity.WardRoomMaster.RoomNo}}</span>"
                        + "<span >&nbsp;/&nbsp;{{entity.WardRoomBedMaster.BedNo}}</span>"
                        + "</div>"
                },
                {
                    field: "VisitNo",
                    displayName: $translate.instant('Visit No')
                },
                {
                    field: "Encounter.AdmissionStatus.Description",
                    displayName: $translate.instant('Admission Status')
                },
                {
                    field: "Department.DepartmentName",
                    displayName: $translate.instant('Department Name')
                },
                {
                    field: "IPClearenceStatus.Description",
                    displayName: $translate.instant('Status')
                },

                {
                    field: "Id",
                    displayName: $translate.instant('common.actions_col.lbl'),
                    cellTemplate: '<div class="ui-grid-cell-contents">\
                                        <span class="grid-action" ng-click="handleEvents(\'view\',entity)" ><img class="drhms-edit-button" src="assets/svg/edit.svg" aria-hidden="true"></span>\
                                   </div>',
                    handleEvent: $scope.handleEvents,
                    actions: []
                }
            ],
            pagerObj: {
                totalItems: 0,
                currentPage: 1,
                startIndex: 0,
                pageSize: 25
            }
        };

        $scope.refreshReactProps();

        $scope.lookupCallback = function (scope, data, options, hasError) {
            $scope.lookup = hasError ? {} : data;
            $scope.refreshReactProps();
            $scope.getList();
        };

        $scope.initLookup = function () {
            var inputData = [{
                "Key": "IPClearenceStatus"
            },
            {
                "Key": "Department",
                Request: {
                    Params: [{
                        Key: 14,
                        Value: [-1, utl.Session.getCurrentFacilityId()]
                    }]
                }
            },

            ];

            var options = {
                action: 'General/Options/getoptions',
                data: inputData,
                type: 'post',
                onComplete: $scope.lookupCallback
            };
            utl.Http.doAction(options);
        }

        $scope.initLookup();
    }

    ipclearenceListController.$inject = ['$rootScope', '$scope', '$stateParams', '$state', '$translate', 'utl', '$timeout', '$filter'];

})();