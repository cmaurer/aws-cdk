import { expect, haveResource } from '@aws-cdk/assert';
import { Construct } from '@aws-cdk/cdk';
import { Stack } from '@aws-cdk/cdk';
import assert = require('assert');
import { Test } from 'nodeunit';
import { InstanceProfile,
    InstanceProfileRef,
    PolicyStatement,
    Role,
    ServicePrincipal
} from '../lib';

/**
 *  Test Cases:
 *  parameters: role
 *  parameters: role, path
 *  parameters: role, path, instanceProfileName
 *  parameters: role, instanceProfileName
 *  parameters: path, instanceProfileName
 *  parameters: path
 *  parameters: instanceProfileName
 *  no parameters
 *  role other than ec2
 *  path other than /
 *  addRoleToPolicy
 *  import/export
 */
export = {
    'parameters: role'(test: Test) {
        const stack = new Stack();

        const testEc2Role = new Role(stack, 'TestEC2Role', {
          assumedBy: new ServicePrincipal('ec2.amazonaws.com')
        });

        new InstanceProfile(stack, 'TestEC2InstanceProfile', {
            role: testEc2Role,
        });
        expect(stack).to(haveResource('AWS::IAM::InstanceProfile', {
            Roles: [
                { Ref: "TestEC2RoleBD27AEF4" }
            ],
            Path: '/'
        }));
        test.done();
    },

    'parameters: role, path'(test: Test) {
        const stack = new Stack();

        const testEc2Role = new Role(stack, 'TestEC2Role', {
          assumedBy: new ServicePrincipal('ec2.amazonaws.com')
        });

        new InstanceProfile(stack, 'TestEC2InstanceProfile', {
            role: testEc2Role,
            path: "/"
        });
        expect(stack).to(haveResource('AWS::IAM::InstanceProfile', {
            Roles: [
                { Ref: "TestEC2RoleBD27AEF4" }
            ],
            Path: '/'
        }));
        test.done();
    },

    'parameters: role, path, instanceProfileName'(test: Test) {
        const stack = new Stack();

        const testEc2Role = new Role(stack, 'TestEC2Role', {
          assumedBy: new ServicePrincipal('ec2.amazonaws.com')
        });

        new InstanceProfile(stack, 'TestEC2InstanceProfile', {
            instanceProfileName: "TestInstanceProfile",
            role: testEc2Role,
            path: "/"
        });
        expect(stack).to(haveResource('AWS::IAM::InstanceProfile', {
            Roles: [
                { Ref: "TestEC2RoleBD27AEF4" }
            ],
            InstanceProfileName: 'TestInstanceProfile',
            Path: '/'
        }));
        test.done();
    },

    'parameters: role, instanceProfileName'(test: Test) {
        const stack = new Stack();

        const testEc2Role = new Role(stack, 'TestEC2Role', {
          assumedBy: new ServicePrincipal('ec2.amazonaws.com')
        });

        new InstanceProfile(stack, 'TestEC2InstanceProfile', {
            instanceProfileName: "TestInstanceProfile",
            role: testEc2Role,
        });
        expect(stack).to(haveResource('AWS::IAM::InstanceProfile', {
            Roles: [
                { Ref: "TestEC2RoleBD27AEF4" }
            ],
            InstanceProfileName: 'TestInstanceProfile',
            Path: '/'
        }));
        test.done();
    },

    'parameters: path, instanceProfileName'(test: Test) {
        const stack = new Stack();

        new InstanceProfile(stack, 'TestEC2InstanceProfile', {
            instanceProfileName: "TestInstanceProfile",
            path: '/'
        });
        expect(stack).to(haveResource('AWS::IAM::InstanceProfile', {
            Roles: [
                { Ref: "TestEC2InstanceProfileEC2Role5106A065" }
            ],
            InstanceProfileName: 'TestInstanceProfile',
            Path: '/'
        }));
        test.done();
    },

    'parameters: instanceProfileName'(test: Test) {
        const stack = new Stack();

        new InstanceProfile(stack, 'TestEC2InstanceProfile', {
            instanceProfileName: "TestInstanceProfile"
        });
        expect(stack).to(haveResource('AWS::IAM::InstanceProfile', {
            Roles: [
                { Ref: "TestEC2InstanceProfileEC2Role5106A065" }
            ],
            InstanceProfileName: 'TestInstanceProfile',
            Path: '/'
        }));
        test.done();
    },

    'parameters: path'(test: Test) {
        const stack = new Stack();

        new InstanceProfile(stack, 'TestEC2InstanceProfile', {
            path: '/'
        });
        expect(stack).to(haveResource('AWS::IAM::InstanceProfile', {
            Roles: [
                { Ref: "TestEC2InstanceProfileEC2Role5106A065" }
            ],
            Path: '/'
        }));
        test.done();
    },

    'no parameters supplied'(test: Test) {
        const stack = new Stack();

        new InstanceProfile(stack, 'NakedTestEC2InstanceProfile', {});
        expect(stack).to(haveResource('AWS::IAM::InstanceProfile', {
            Roles: [
                { Ref: "NakedTestEC2InstanceProfileEC2Role59DF0EED" }
            ],
            Path: '/'
        }));
        test.done();
    },

    'role other than ec2'(test: Test) {
        const stack = new Stack();

        const testEc2Role = new Role(stack, 'TestEC2SNSRole', {
          assumedBy: new ServicePrincipal('sns.amazonaws.com')
        });

        new InstanceProfile(stack, 'TestEC2InstanceProfile', {
            role: testEc2Role
        });

        expect(stack).to(haveResource('AWS::IAM::InstanceProfile', {
            Roles: [
                { Ref: "TestEC2SNSRole3159CBC5" }
            ],
            Path: '/'
        }));
        test.done();
    },

    'custom path supplied'(test: Test) {
        const stack = new Stack();

        const testEc2Role = new Role(stack, 'TestEC2Role', {
            assumedBy: new ServicePrincipal('ec2.amazonaws.com')
          });

        const customPath = '/TestEC2Role/CustomPath';

        new InstanceProfile(stack, 'TestEC2InstanceProfile', {
            role: testEc2Role,
            path: customPath
        });
        expect(stack).to(haveResource('AWS::IAM::InstanceProfile', {
            Roles: [
                { Ref: "TestEC2RoleBD27AEF4" }
            ],
            Path: '/TestEC2Role/CustomPath'
        }));
        test.done();
    },

    'addToRolePolicy adds a policy'(test: Test) {
        const stack = new Stack();

        const testEc2Role = new Role(stack, 'TestEC2Role', {
            assumedBy: new ServicePrincipal('ec2.amazonaws.com')
          });

        const instanceProfile = new InstanceProfile(stack, 'TestEC2InstanceProfile', {
            role: testEc2Role
        });

        instanceProfile.addToRolePolicy(
            new PolicyStatement().addAction('confirm:itsthesame')
        );

        expect(stack).to(haveResource('AWS::IAM::InstanceProfile', {
            Roles: [
                { Ref: "TestEC2RoleBD27AEF4" }
            ],
            Path: '/'
        }));

        expect(stack).to(haveResource('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: [
                    {
                        Action: "confirm:itsthesame",
                        Effect: "Allow"
                    }
                ],
                Version: "2012-10-17"
            },
            PolicyName: "TestEC2RoleDefaultPolicyD19D9935",
            Roles: [
                { Ref: "TestEC2RoleBD27AEF4" }
            ]
        }));
        test.done();
    },
    'import/export': {
        'default ec2 role created'(test: Test) {
            const stack = new Stack();

            new InstanceProfile(stack, 'TestEC2InstanceProfile', {});
            expect(stack).to(haveResource('AWS::IAM::InstanceProfile', {
                Roles: [
                    { Ref: "TestEC2InstanceProfileEC2Role5106A065" }
                ],
                Path: '/'
            }));
            test.done();
        },

        'instanceProfile.export() can be used to add Outputs to the stack and returns a InstanceProfileRef object'(test: Test) {
          // GIVEN
          const stack1 = new Stack();
          const stack2 = new Stack();
          const testInstanceProfile1 = newTestInstanceProfile(stack1, 'TestInstanceProfile1', "/TestInstanceProfilePath");

          // WHEN
          const props = testInstanceProfile1.export();
          const imported = InstanceProfileRef.import(stack2, 'Imported', props);
          // test imported values are expected
          assert.equal(imported.path, "/TestInstanceProfilePath", "imported path value was not an expected value");
          assert.equal(imported.uniqueId, "Imported", "unique id value was not an expected value");
          // test addRoleToPolicy on imported
          imported.addToRolePolicy(
              new PolicyStatement().addAction('confirm:itsthesame')
          );
          test.done();
        },
      }
};

function newTestInstanceProfile(parent: Construct, name: string, pathName: string) {
    return new InstanceProfile(parent, name, {
        path: pathName
    });
}