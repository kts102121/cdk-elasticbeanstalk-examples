package org.ron.pcs.demo.user.domain;

import java.io.Serializable;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;

import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Entity(name = "roles")
@ToString
@Getter
@NoArgsConstructor
public class Role implements Serializable {
    /**
     *
     */
    private static final long serialVersionUID = -3052123544982154406L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Builder
    public Role(String name) {
        this.name = name;
    }
}