function SuccessApi(res, statusCode, result, message = 'Data Fetched Successfully') {
    res.status(statusCode).json({
        status: 'Success',
        statusCode,
        data: result,
        message,
    });
}
function FailedApi(res, statusCode, error ) {
    res.status(statusCode).json({
        status: 'Failure',
        statusCode,
        error: error,
    });
}
export {
    SuccessApi,
    FailedApi
};