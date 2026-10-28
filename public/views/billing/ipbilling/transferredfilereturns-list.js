(function () {
    'use strict';

    angular
        .module('app.pages')
        .controller('TransferredFileReturnsListController', TransferredFileReturnsListController);

    function TransferredFileReturnsListController($rootScope,$timeout,$scope, $stateParams, $state, $translate, utl, $filter) {
        var vm = this;
        $scope.Items = [];
        $scope.currentfilter = {
            MRDIPFileStatusId: [5,7],
            RequestDate: utl.Formatter.getCurrentDate(),
        };
        //  $scope.currentfilter.DocumentDate = new Date();
        $scope.currentcontext = {};

        $scope.getListCallback = function (scope, res, options, hasError) {
            vm.gridConfig.data = res.Data;
            vm.gridConfig.pagerObj.totalItems = res.PageContext.TotalRecords;
            $scope.refreshReactProps();
        };

        $scope.getList = function () {
            var FromDate = $filter('date')($scope.currentfilter.RequestDate, 'yyyy-MM-dd 00:00:00') || null;
            var ToDate = $filter('date')($scope.currentfilter.RequestDate, 'yyyy-MM-dd 23:59:59') || null;
            var inputData = {
                Params: [
                    {
                        Key: 1,
                        Value: $scope.currentfilter.PatientName
                    },
                    {
                        Key: 2,
                        Value: $scope.currentfilter.VisitNo
                    },
                    {
                        Key: 6,
                        Value: $scope.currentfilter.MRDIPFileStatusId
                    },
                    { Key: 9, Value: FromDate },
                    { Key: 10, Value: ToDate },
                ],
                PageContext: {
                    PageSize: vm.gridConfig.pagerObj.pageSize,
                    PageNumber: vm.gridConfig.pagerObj.currentPage
                }
            };

            var options = {
                action: 'IPManagement/IPFileRequest/GetIPFileRequests',
                data: inputData,
                type: 'post',
                onComplete: $scope.getListCallback
            };

            utl.Http.doAction(options);

        };

        //Grid Actions

        $scope.item = {};

        $scope.deleteItemCallback = function (scope, data, options, hasError) {
            utl.Alert.showSuccessMsg($translate.instant('common.delete_successmsg.lbl'));
            $scope.getList();
        };

        $scope.onDeleteConfirmed = function (deleteId) {
            var options = {
                action: 'IPManagement/IPFileRequest/DeleteIPFileRequest',
                data: {
                    Id: deleteId
                },
                type: 'post',
                onComplete: $scope.deleteItemCallback
            };
            utl.Http.doAction(options);
        }

        $scope.handleEvents = function (actionType, entity) {
            if (actionType == 'filereturn') {
                $state.go('app.transferredfilereturnsform', {
                    id: entity.Id,
                });
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
            var items = vm.gridConfig.data || [];
            var entity = null;
            var targetId = payload && (payload.id || (payload.entity && payload.entity.Id));
            if (targetId) {
                for (var i = 0; i < items.length; i++) {
                    if (items[i].Id === targetId) { entity = items[i]; break; }
                }
            } else if (payload && payload.entity) {
                entity = payload.entity;
            }

            if (actionType === 'fileReturn' || actionType === 'filereturn') {
                if (entity) {
                    $scope.handleEvents('filereturn', entity);
                } else if (targetId) {
                    $state.go('app.transferredfilereturnsform', { id: targetId });
                }
            } else if (actionType === 'patientinfo' || (actionType === 'cellAction' && payload && payload.key === 'patient')) {
                if (entity) {
                    $scope.handleEvents('patientinfo', entity);
                }
            } else if (actionType === 'filterChange') {
                if (payload && payload.field) {
                    $scope.currentfilter[payload.field] = payload.value;
                }
            } else if (actionType === 'statusChange') {
                $scope.currentfilter.MRDIPFileStatusId = payload.id;
                vm.gridConfig.pagerObj.currentPage = 1;
                $scope.getList();
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

        $scope.handleListAction = $scope.handleReactAction;
        $scope.handleFilterAction = function (actionType, payload) {
            $scope.handleReactAction('statusChange', payload);
        };

        $scope.refreshReactProps = function () {
            var items = vm.gridConfig.data || [];
            var rows = items.map(function (entity) {
                var requestUser = entity.RequestUser || {};
                var approveUser = entity.ApproveUser || {};
                var status = entity.MRDIPFileStatus || {};
                return {
                    id: entity.Id,
                    requestDateDisplay: entity.RequestDate ? $filter('date')(entity.RequestDate, 'dd-MMM-yyyy') : '',
                    requestTimeDisplay: entity.RequestDate ? $filter('date')(entity.RequestDate, 'HH:mm') : '',
                    visitNo: entity.VisitNo,
                    patientName: entity.PatientName,
                    patientId: entity.PatientId || (entity.Patient && entity.Patient.Id),
                    mrn: entity.Patient && entity.Patient.MRN,
                    requestUserTitle: requestUser.Title && requestUser.Title.Description,
                    requestUserFirstName: requestUser.FirstName,
                    requestUserLastName: requestUser.LastName,
                    approveUserTitle: approveUser.Title && approveUser.Title.Description,
                    approveUserFirstName: approveUser.FirstName,
                    approveUserLastName: approveUser.LastName,
                    doctorName: entity.DoctorName,
                    statusDescription: status.Description,
                    statusId: entity.MRDIPFileStatusId
                };
            });

            $scope.reactProps = {
                headers: vm.gridConfig.columnDefs.map(function (c) { return c.displayName; }),
                rows: rows,
                items: items,
                lookup: $scope.lookup || {},
                currentfilter: $scope.currentfilter || {},
                pager: {
                    totalItems: vm.gridConfig.pagerObj.totalItems || 0,
                    currentPage: vm.gridConfig.pagerObj.currentPage || 1,
                    pageSize: vm.gridConfig.pagerObj.pageSize || 25
                }
            };

            $scope.reactPropsListContainer = {
                reactProps: {
                    headers: vm.gridConfig.columnDefs.map(function (c) { return c.displayName; }),
                    rows: rows
                },
                onAction: $scope.handleReactAction
            };

            $scope.reactPropsFilterContainer = {
                reactProps: {
                    statusOptions: ($scope.lookup && $scope.lookup.MRDIPFileStatus) || [],
                    statusId: $scope.currentfilter.MRDIPFileStatusId
                },
                onAction: $scope.handleFilterAction
            };
            $scope.$applyAsync();
        };


        vm.gridConfig = {
            enableColumnResizing: true,
            background: {
                style:{
                    field:'MRDIPFileStatusId',
                    value:{
                        7:{'background':'red','color':'#fff'}
                    }
                }
            },
            columnDefs: [
                {
                    field: "S.No",
                    displayName: $translate.instant('S.No'),
                    cellTemplate: "<div class='ui-grid-cell-contents'><span >{{index+1}}</span> </div>"
                },
                {
                    field: "RequestDate",
                    displayName: $translate.instant('Date'),
                    cellTemplate: "<div class='ui-grid-cell-contents'><span >{{entity.RequestDate | date : 'dd-MMM-yyyy'}} </span>" + "<span >{{entity.RequestDate| date: 'HH:mm'}}</span>" + "</div>"
                },

                {
                    field: "VisitNo",
                    displayName: $translate.instant('Visit No')
                },
                {
                    field: "PatientName",
                    displayName: $translate.instant('Patient Name')
                },
                {
                    field: "RequestUser",
                    displayName: $translate.instant('inventory.stockrequests.requestedby.lbl'),
                    cellTemplate: "<div class='ui-grid-cell-contents'><span >{{entity.RequestUser.Title.Description}}&nbsp;</span>" + "<span >{{entity.RequestUser.FirstName}}&nbsp;</span>" + "<span >{{entity.RequestUser.LastName}}</span>" + "</div>"
                },
                {
                    field: "ApproveUser",
                    displayName: $translate.instant('Approved By'),
                    cellTemplate: "<div class='ui-grid-cell-contents'><span >{{entity.ApproveUser.Title.Description}}&nbsp;</span>" + "<span >{{entity.ApproveUser.FirstName}}&nbsp;</span>" + "<span >{{entity.ApproveUser.LastName}}</span>" + "</div>"
                },
                {
                    field: "DoctorName",
                    displayName: $translate.instant('Doctor Name')
                },
                {
                    field: "MRDIPFileStatus.Description",
                    displayName: $translate.instant('admissions.status.lbl'),
                    cellTemplate: "<div class='ui-grid-cell-contents'>\
                                                    <div style='height:15px;width:20px;border-radius: 7px;margin-top: 4px;class='col-sm-2'></div>\
                                                &nbsp;<span>{{entity.MRDIPFileStatus.Description}}</span>\
                                            </div>"
                },
                {
                    field: "Id",
                    displayName: $translate.instant('common.actions_col.lbl'),
                    cellTemplate: '<div class="ui-grid-cell-contents">\
                    <span class="grid-action" ng-click="handleEvents(\'filereturn\',entity)" ng-hide="entity.MRDIPFileStatusId==8"><i class="btn text-white dem-color4  btn-xs" aria-hidden="true"><strong>File Return</strong></i></span>\
                    <span class="grid-action" ng-click="handleEvents(\'filereturn\',entity)" ng-show="entity.MRDIPFileStatusId==8"><i class="btn text-white dem-color4  btn-xs" aria-hidden="true"><strong>View</strong></i></span>\
                            </div>',
                    handleEvent: $scope.handleEvents,
                    actions: [
                        // { actiontype: 'edit', display: 'common.editaction.lbl' },
                        // { actiontype: 'delete', display: 'common.deleteaction.lbl' }
                    ]
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

        $timeout(function () {
            removeFloatingNav();
        }, 100);

        function removeFloatingNav() {
            $rootScope.app.layout.isCollapsed = true;
        }

        $scope.lookupCallback = function (scope, data, options, hasError) {
            $scope.lookup = hasError ? {} : data;
            $scope.refreshReactProps();
            $scope.getList();
        };

        $scope.initLookup = function () {
            var inputData = [
                {
                    "Key": "MRDIPFileStatus"
                }
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

    TransferredFileReturnsListController.$inject = ['$rootScope','$timeout','$scope', '$stateParams', '$state', '$translate', 'utl', '$filter'];

})();