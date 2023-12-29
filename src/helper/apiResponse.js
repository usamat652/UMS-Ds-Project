function SuccessApi(res, statusCode, result, message) {
    res.status(statusCode).json({
        status: 'Success',
        statusCode,
        data: result,
        message: message
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