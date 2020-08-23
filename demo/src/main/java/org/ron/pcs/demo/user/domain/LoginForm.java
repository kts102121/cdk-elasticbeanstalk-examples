package org.ron.pcs.demo.user.domain;

import lombok.ToString;

import javax.validation.constraints.NotNull;

import lombok.Builder;
import lombok.Getter;

@Getter
@ToString
public class LoginForm {

    @NotNull
    private String username;

    @NotNull
    private String password;

    @Builder
    public LoginForm(final String username, final String password) {
        this.username = username;
        this.password = password;
    }
}
