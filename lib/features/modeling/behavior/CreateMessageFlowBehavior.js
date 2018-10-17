import inherits from 'inherits';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';

import {
  is,
  getBusinessObject
} from '../../../util/ModelUtil';


/**
 * Behavior for replacing none event to message catch event after connecting with message flow
 */
export default function CreateMessageFlowBehavior(eventBus, modeling, bpmnReplace) {

  CommandInterceptor.call(this, eventBus);

  function hasNoEventDefinition(element) {
    return !getBusinessObject(element).eventDefinitions;
  }

  function findParticipantParent(element) {
    var parent = element;

    while ((parent = (parent || {}).parent)) {
      if (is(parent, 'bpmn:Participant')) {
        return parent;
      }
    }

    return null;
  }

  function isReplaceCandidate(element, source) {
    var sourceParticipantParent = findParticipantParent(source),
        targetParticipantParent = findParticipantParent(element);

    return (
      is(element, 'bpmn:IntermediateThrowEvent') &&
      hasNoEventDefinition(element) && // todo: discuss - all kind of intermediate events or just none events ??
      sourceParticipantParent &&
      targetParticipantParent &&
      sourceParticipantParent !== targetParticipantParent
    );
  }

  // allows connecting to external none events, which will be converted to message receive event afterwards
  this.canExecute('connection.create', 1500, function(context) {
    var source = context.source,
        target = context.target;

    if (isReplaceCandidate(target, source)) {

      return { type: 'bpmn:MessageFlow' };
    }
  }, true, this);

  // replace none event with message receive event
  this.postExecuted('connection.create', function(context) {
    var source = context.context.source,
        target = context.context.target;

    if (isReplaceCandidate(target, source)) {

      bpmnReplace.replaceElement(target, {
        type: 'bpmn:IntermediateCatchEvent',
        eventDefinitionType: 'bpmn:MessageEventDefinition'
      });
    }
  });
}

CreateMessageFlowBehavior.$inject = [
  'eventBus',
  'modeling',
  'bpmnReplace'
];

inherits(CreateMessageFlowBehavior, CommandInterceptor);
