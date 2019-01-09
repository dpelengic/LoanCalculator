var app = angular.module("myApp", ["ui.bootstrap","chart.js", "ngMessages"]);

app.service("CalcService", function() {

    this.LoanData = function(inputData) {
        var myRate = inputData.rate / 100 / 12; // monthly rate
        var myDuration = inputData.duration * 12; // months
        var myMonthlyPayment = (myRate / ( 1 - Math.pow( 1 + myRate, -myDuration))) *  inputData.principal; // monthly payment
	var myInitialCapital = inputData.pValue - inputData.principal;

	var loanDataObj = {"initialCapital":myInitialCapital, "fullPrincipal":inputData.principal, "loanRate":myRate, "loanDuration":myDuration, "monthlyPayment":myMonthlyPayment, "extraMonthlyPayment":inputData.extra};

	return loanDataObj;
    }

    this.LoanAmortization = function(loanData) {
	var loanAmortizationObj = [];
	var myPrincipal = loanData.fullPrincipal;
	var myMonthlyPayment = loanData.monthlyPayment;
	var myDuration = loanData.loanDuration;
	var myExtraPayment = loanData.extraMonthlyPayment;
	var myNewPrincipal = 0;

        // generate amortization
        for(var i = 0; i < myDuration; i++){
            var myInterest = myPrincipal * loanData.loanRate; // interest paid for this month
            var myPaidPrincipal = myMonthlyPayment - myInterest; // principal paid for this month

            if ( myPrincipal < myMonthlyPayment ) {
		myMonthlyPayment = myPrincipal + myInterest;
		myExtraPayment = 0;
                myPaidPrincipal = myPrincipal;
                myDuration = i;
            } else if ( myPrincipal < (myMonthlyPayment + myExtraPayment) ) {
		myExtraPayment = myPrincipal + myInterest - myMonthlyPayment;
                myDuration = i;
            }

	    myNewPrincipal = myPrincipal - myPaidPrincipal - myExtraPayment;
            var extObj = {"month":i+1, "fullPrincipal":myPrincipal, "monthlyPrincipal":myPaidPrincipal, "interest":myInterest, "monthlyPayment":myMonthlyPayment, "extraMonthlyPayment":myExtraPayment, "newPrincipal":myNewPrincipal };

	    loanAmortizationObj = loanAmortizationObj.concat(extObj);
            myPrincipal = myPrincipal - myPaidPrincipal - myExtraPayment; // new total principal
        }
        return loanAmortizationObj;
    }

    this.LoanResults = function(amortizationData, loanData) {
	var myTotalInterest = 0;
	var myTotalPrincipal = 0;
	var myTotalExtraPayment = 0;
	var myDuration = 0;

	// sum up all paid interest, principal, extra and count elements (for duration)
	for(var i in amortizationData) {
	    myTotalPrincipal += amortizationData[i].monthlyPrincipal + amortizationData[i].extraMonthlyPayment;
	    myTotalInterest += amortizationData[i].interest;
	    myTotalExtraPayment += amortizationData[i].extraMonthlyPayment;
	    myDuration++;
	}

	var loanResultObj = {"initialCapital":loanData.initialCapital ,"principal":myTotalPrincipal, "withInterest":myTotalPrincipal + myTotalInterest, "duration":myDuration, "paidInterest":myTotalInterest, "monthlyPayment":loanData.monthlyPayment, "extraMonthlyPayment":loanData.extraMonthlyPayment, "totalExtraMonthlyPayment":myTotalExtraPayment}

        return loanResultObj;
    }


    this.RentCompare = function(inputData, amortizationData, loanResultData) { // loan vs rent compare
        var myResellTime = inputData.resellAfter * 12; // months
        var myInterestPaidSoFar = 0;
        var myPrincipalPaidSoFar = 0;

	// sum up all paid interest and principal (for rent compare duration)
        for(var i = 0; i < myResellTime; i++) {
            myPrincipalPaidSoFar += amortizationData[i].monthlyPrincipal + amortizationData[i].extraMonthlyPayment;
            myInterestPaidSoFar += amortizationData[i].interest;
        }

        var myTotalRent = inputData.rent * myResellTime; // paid rent for specified duration
        var myExtraExpensesIfOwner = inputData.expenses * myResellTime; // expenses (if property owner)
        var myPropertyResellValue = inputData.resell;
        var mySellTaxAmount = inputData.resell * inputData.tax / 100; // property sale tax
        var myGainTaxAmount = 0;

        // capital gain tax - only if sale exceeds the purchase value, and only the excess amount is taxed
        if (inputData.resell > inputData.pValue) {
            myGainTaxAmount = (inputData.resell - inputData.pValue) * inputData.gainTax / 100;
        }

        // assuming the difference between rent and monthly loan bill would go for savings
        var mySaveWhileRenting = (loanResultData.extraMonthlyPayment + loanResultData.monthlyPayment - inputData.rent) * myResellTime;
	// calculate net gain/loss of capital after resale
	var myCapitalAfterResell = myPropertyResellValue - (inputData.principal - myPrincipalPaidSoFar) - myGainTaxAmount - mySellTaxAmount - myExtraExpensesIfOwner;

        var rentCompareObj = {"totalRent":myTotalRent, "extraExpensesIfOwner":myExtraExpensesIfOwner, "propertyResellValue":myPropertyResellValue, "saleTaxAmount":mySellTaxAmount, "gainsTaxAmount":myGainTaxAmount, "interestPaidSoFar":myInterestPaidSoFar, "principalPaidSoFar":myPrincipalPaidSoFar, "saveWhileRenting": mySaveWhileRenting, "capitalAfterResell":myCapitalAfterResell, "resellTime":myResellTime}

        return rentCompareObj;
    }

    // loan pie chart
    this.LoanChart = function(loanData, loanResultData) {
	var loanChartData = [Math.round((loanData.initialCapital + 1e-15) * 100) / 100, Math.round((loanData.fullPrincipal + 1e-15) * 100) / 100, Math.round((loanResultData.paidInterest + 1e-15) * 100) / 100];
        return loanChartData;
    }

    // rent pie chart
    this.RentChart = function(loanData, rentCompareData) {
        var myCapitalAfterResellForGraph = rentCompareData.capitalAfterResell;
	var mySaveWhileRentingForGraph = rentCompareData.saveWhileRenting + loanData.initialCapital;

        // negative values dont work too well with pie chart
        if (rentCompareData.capitalAfterResell < 0) {
            myCapitalAfterResellForGraph = 0;
        }
	if (rentCompareData.saveWhileRenting + loanData.initialCapital < 0) {
            mySaveWhileRentingForGraph = 0;
        }
        var rentChartData = [ (Math.round((myCapitalAfterResellForGraph + 1e-15) * 100) / 100), (Math.round((mySaveWhileRentingForGraph + 1e-15) * 100) / 100) ];
        return rentChartData;
    }

});

app.controller("loanCtrl", function($scope, CalcService) {

    $scope.input = {"pValue":130000,"principal":130000,"rate":2.8,"duration":20,"extra":0,"rent":450,"resellAfter":5,"resell":130000,"expenses":100,"tax":2,"gainTax":20} // default values    
    $scope.calculateRentVsLoan = false;

    $scope.calculate = function() {
        $scope.showRentVsLoan = false;
        var loanData = CalcService.LoanData($scope.input); // input data
        $scope.loanAmortization = CalcService.LoanAmortization(loanData); // generate amortization plan
        $scope.loanResults = CalcService.LoanResults($scope.loanAmortization, loanData); // generate loan results
        $scope.options = {legend: {display: true}};

        // loan pie chart
        $scope.loanChartLabels = ["Own Capital", "Principal", "Interest"];
        $scope.loanChartData = CalcService.LoanChart(loanData, $scope.loanResults);


	// pagination for amorization data
	$scope.pagViewby = 12;
	$scope.pagTotalItems = $scope.loanResults.duration;
	$scope.pagCurrentPage = 1;
	$scope.pagItemsPerPage = $scope.pagViewby;
	$scope.pagMaxSize = 25; //Number of pager buttons to show

        if ($scope.calculateRentVsLoan) {
	    $scope.rentCompare = CalcService.RentCompare($scope.input, $scope.loanAmortization, $scope.loanResults); // generate rent vs loan comparison

	    // rent pie chart
            $scope.rentChartLabels = ["Buy & Resell", "Rent & Save"];
            $scope.rentChartData = CalcService.RentChart(loanData, $scope.rentCompare);

	    // show rent data
	    $scope.showRentVsLoan = true;
        }
	// show loan data
	$scope.calculateClicked = true;
    }

});
