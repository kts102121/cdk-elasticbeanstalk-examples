package org.ron.pcs.demo.application.exception.domain.user;

import org.ron.pcs.demo.application.exception.domain.BusinessException;
import org.ron.pcs.demo.application.exception.dto.ErrorCode;

public class UserNotFoundException extends BusinessException {

    public UserNotFoundException(String message) {
        super(message, ErrorCode.USER_NOT_FOUND);
    }
}
