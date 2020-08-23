package org.ron.pcs.demo.application.exception.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

// kudos to https://github.com/cheese10yun/spring-guide
@JsonFormat(shape = JsonFormat.Shape.OBJECT)
public enum ErrorCode {

    INTERNAL_SERVER_ERROR(400, "Something went wrong. Please try again later :)"),

    USER_NOT_FOUND(400, "User does not exists"),
    IDENTIFIER_DUPLICATE(400, "Email or username already exists"),
    WRONG_CREDENTIALS(400, "Wrong credentails. Please check your username or password");

    private final String message;
    private int status;

    ErrorCode(final int status, final String message) {
        this.status = status;
        this.message = message;
    }

    public String getMessage() {
        return this.message;
    }

    public int getStatus() {
        return status;
    }
}
